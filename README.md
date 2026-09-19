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
| `STRIPE_SECRET_KEY` | `/var/www/opal/.env` on the server | **Restricted** key `rk_…`. One permission only: Checkout Sessions = **Write**. That is the sole Stripe API call the code makes |
| `STRIPE_WEBHOOK_SECRET` | `/var/www/opal/.env` on the server | `whsec_…` from the webhook endpoint |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.production` (server) / `.env.local` (dev) | `pk_…` — public by design, ships in the browser bundle |
| `STOREFRONT_URL` | `/var/www/opal/.env` on the server | Origin Stripe returns the customer to |

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

1. Swap test keys for live ones in `/var/www/opal/.env` on the server — never a committed file. See [DEPLOYMENT.md](DEPLOYMENT.md).
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

## Production deployment

Production runs on a **Hostinger VPS** — Docker Compose for the API, pm2 for
the storefront, nginx in front.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for deploy commands, environment files,
database operations, rollback and the Stripe webhook health check.

> Earlier revisions of this README documented a Fly.io + Vercel setup. That is
> no longer used, and `opal-api/fly.toml` is legacy — left in place pending a
> decision to remove it.
