# Opal Perfumes

Luxury Arabian fragrance e-commerce platform — UAE-based.

## Apps

| Folder | Stack | Purpose |
|---|---|---|
| **`opal-api/`** | PHP 8.4 + Slim 4 + MongoDB | REST API (products, categories, customers, cart, orders, settings, media) |
| **`opal-admin/`** | React + Vite + Tailwind | Admin portal — product, category, order & content management |
| **`opal-store-next/`** | Next.js 16 + TypeScript + Tailwind | Customer storefront with SSR/SEO and Apple-style scroll hero |

## Local development

```bash
# Start MongoDB + API
docker compose up -d

# Customer store (Next.js)  → http://localhost:3000
cd opal-store-next && npm install && cp .env.example .env.local && npm run dev

# Admin portal (Vite)        → http://localhost:5174
cd opal-admin && npm install && cp .env.example .env.local && npm run dev -- --port 5174 --strictPort
```

API: `http://localhost:8000/api` · Default admin: `admin@opalperfumes.com / Admin@1234`

## Features

- Server-rendered storefront with JSON-LD Product/Organization/Breadcrumb schemas
- Scroll-driven hero with 192-frame WebP sequence (background removed via rembg)
- Apple-style preloader, scene transitions, scroll-controlled video
- Customer auth (JWT) — register, login, profile
- Cart and orders — **card payment via Stripe embedded Checkout**, or cash on delivery
- Admin: product CRUD, bulk Excel import with Google Drive image URLs, media library, site settings, inquiries

---

## Stripe payments

Card payment uses **Checkout Sessions in embedded mode** — Stripe's payment
form mounts inside `/checkout`, so the customer never leaves the site.

**Fulfilment is driven by the webhook, not the success page.** A customer can
pay and then close the tab before the redirect lands, and delayed-notification
payment methods settle hours later with no browser involved at all. So
`POST /api/orders` with `payment_method: 'card'` writes the order as `pending`
and leaves the cart alone; `POST /api/stripe/webhook` is what marks it paid and
empties the cart.

### Keys

| Variable | Where | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | `opal-api/.env` (or Fly secret) | **Restricted** key `rk_…`, scoped to Checkout Sessions=write, PaymentIntents=read |
| `STRIPE_WEBHOOK_SECRET` | `opal-api/.env` (or Fly secret) | `whsec_…` from the webhook endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `opal-store-next/.env.local` | `pk_…` — public by design, ships in the browser bundle |
| `STOREFRONT_URL` | `opal-api/.env` | Origin Stripe returns the customer to |

Prefer a [restricted key](https://dashboard.stripe.com/apikeys) (`rk_`) over a
secret key (`sk_`) — one that leaks can't drain the account. Never commit a
key: a `pre-commit` hook in `.githooks/` blocks them. Enable it in a fresh
clone with:

```bash
git config core.hooksPath .githooks
```

With no key set, the card option is hidden and the API rejects
`payment_method: 'card'` with a 503 — cash on delivery keeps working.

### Local testing

```bash
npm i -g @stripe/cli
stripe login
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

Copy the `whsec_…` it prints into your root `.env` as `STRIPE_WEBHOOK_SECRET`,
then `docker compose up -d` to pick it up. Pay with card `4242 4242 4242 4242`,
any future expiry and any CVC. To exercise the delayed-payment path, trigger
`stripe trigger checkout.session.async_payment_succeeded`.

### Before going live

1. Swap test keys for live ones (as Fly.io secrets, not a committed file).
2. Add the live webhook endpoint at `https://<api-host>/api/stripe/webhook`
   subscribed to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed` and `checkout.session.expired`.
3. Enable the payment methods you want at
   [Dashboard → Payment methods](https://dashboard.stripe.com/settings/payment_methods).
   The code deliberately omits `payment_method_types`, so methods turn on there
   with no code change.
4. Decide on **VAT**. Stripe Tax is *not* enabled — prices are charged as
   stored. Turning on `automatic_tax` without an active UAE registration
   collects nothing while looking like it works.
5. Run the [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live.md).

---

## Production deployment (free tier, always-on)

Three accounts, all free, total **$0/month**:

| Service | Host | What it runs |
|---|---|---|
| **MongoDB Atlas M0** | https://cloud.mongodb.com | Database |
| **Fly.io** (shared-cpu-1x) | https://fly.io | PHP API — always-on machine, no cold starts |
| **Vercel** × 2 | https://vercel.com | Next.js storefront + Vite admin |

### 1. MongoDB Atlas

1. Sign up → **Build a Database** → **M0 Free**
2. Provider: **AWS** · Region: **Mumbai `ap-south-1`** (closest to UAE) or Frankfurt
3. Cluster name: `opal-test`
4. **Security → Database Access** → *Add user* (username + auto-generated password — copy both)
5. **Security → Network Access** → *Add IP* → **Allow Access from Anywhere** (`0.0.0.0/0`) for test
6. **Clusters → Connect → Drivers → PHP** — copy the connection string. It looks like:

   ```
   mongodb+srv://USER:PASS@opal-test.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

7. **Seed initial data**: from your local machine,
   ```bash
   export MONGO_URI="<paste connection string with password>"
   export MONGO_DB="opal_perfumes"
   docker exec opal_api php seed.php
   ```
   (Or use a one-time `docker compose run --rm api php seed.php` with the env vars set.)

### 2. Fly.io — opal-api

```bash
# Install the CLI once (Windows PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Auth
fly auth login

# From repo root
cd opal-api

# Create the app (uses fly.toml we ship in this folder) — DO NOT deploy yet
fly launch --no-deploy --copy-config

# 3 GB persistent volume for admin-uploaded product images
fly volumes create opal_uploads --region fra --size 3

# Secrets (replace with real values — they're injected as env vars at runtime)
fly secrets set \
  MONGO_URI='mongodb+srv://USER:PASS@opal-test.xxxxx.mongodb.net/?retryWrites=true&w=majority' \
  JWT_SECRET='<generate a 32+ char random string>' \
  ALLOWED_ORIGINS='https://opal-perfumes.vercel.app,https://opal-admin.vercel.app'

# Deploy
fly deploy

# Note the resulting URL: https://opal-api.fly.dev
```

After Vercel deployments are up, **come back and update `ALLOWED_ORIGINS`** with the real Vercel URLs:

```bash
fly secrets set ALLOWED_ORIGINS='https://<your-vercel-domain>.vercel.app,https://<your-admin>.vercel.app'
```

### 3. Vercel — opal-store-next

1. https://vercel.com/new → import `Hijas17/opal-perfumes`
2. **Root Directory:** `opal-store-next`
3. **Framework Preset:** Next.js (auto-detected)
4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL      = https://opal-api.fly.dev/api
   NEXT_PUBLIC_UPLOADS_URL  = https://opal-api.fly.dev/uploads
   NEXT_PUBLIC_SITE_URL     = https://<this-deployment-url>.vercel.app
   ```
5. **Deploy.** Note the resulting URL.

### 4. Vercel — opal-admin

1. https://vercel.com/new → import the same repo *again* as a second project
2. **Root Directory:** `opal-admin`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment Variables:**
   ```
   VITE_API_URL      = https://opal-api.fly.dev/api
   VITE_UPLOADS_URL  = https://opal-api.fly.dev/uploads
   ```
5. **Deploy.** Note the URL.

### 5. Finalise CORS

Once both Vercel URLs are known, update Fly with the real allow-list:

```bash
cd opal-api
fly secrets set ALLOWED_ORIGINS='https://opal-perfumes.vercel.app,https://opal-admin.vercel.app'
```

This restart is automatic.

---

## Free-tier limits & caveats

| Limit | Tier | Mitigation if hit |
|---|---|---|
| 512 MB Atlas storage | M0 | Upgrade to M10 ($57/mo) when products + orders + media metadata grow |
| 256 MB Fly RAM | shared-cpu-1x | `fly scale memory 512` ($1.94/mo for shared-cpu-2x) |
| 3 GB Fly volume | volume created | `fly volumes extend opal_uploads --size 10` (free up to volume tier limits) |
| 100 GB Vercel bandwidth/mo | hobby | Move to Pro ($20/mo) — only relevant if many real users |
| Vercel commercial-use | hobby | Migrate to Pro before launch with real customers |
