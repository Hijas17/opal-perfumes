# Deployment

Production runs on a single **Hostinger VPS** (Ubuntu 24.04), with nginx in
front. The repo is checked out at `/var/www/opal` on the `main` branch.

> The README's "Production deployment (free tier)" section describes a Fly.io +
> Vercel setup that is **no longer used**. `opal-api/fly.toml` is likewise
> legacy. This file is the accurate one.

| App | How it runs | Served at |
|---|---|---|
| `opal-api` | Docker Compose — containers `opal_api` + `opal_mongodb` | `api.opalperfume.com` → nginx → `127.0.0.1:8000` |
| `opal-store-next` | Node under **pm2**, process name `opal-store-next` | `opalperfume.com` |
| `opal-admin` | *(not yet documented — see Gaps below)* | `admin.opalperfume.com` |

The `deploy` user is **not** in the `docker` group, so every `docker` command
needs `sudo`.

---

## Deploying

Both apps live in one repo, so `git pull` from either directory updates
everything. Deploy the API first when a change touches both.

### API

```bash
cd /var/www/opal && git pull
sudo docker compose exec api composer install --no-dev --optimize-autoloader
sudo docker compose up -d
```

`composer install` runs **inside the container**. `vendor/` is gitignored and
shared with the host through a volume mount, so a `git pull` alone never
updates dependencies — skip this step after a change to `composer.json` and the
API fatals the first time the new code path runs.

PHP usually picks up changed files without a restart. If a newly added route
404s, that's stale opcache — `sudo docker compose restart api` clears it.

### Storefront

```bash
cd /var/www/opal/opal-store-next && git pull && npm ci && rm -rf .next && npm run build && pm2 restart opal-store-next
```

**Do not drop the `npm ci`.** `node_modules/` is gitignored, so a change to
`package.json` needs an install or the build fails with `Module not found`.
It's cheap when nothing changed.

`NEXT_PUBLIC_*` values are **inlined at build time**, not read at runtime.
Editing `.env.production` without rebuilding changes nothing, silently.

---

## Environment files

Three files, none of them in git. Know which one you want before editing.

| File | Read by | Holds |
|---|---|---|
| `/var/www/opal/.env` | Docker Compose, substituted into `docker-compose.yml` | `JWT_SECRET`, `ALLOWED_ORIGINS`, `MAIL_*`, `SMTP_*`, `STOREFRONT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `/var/www/opal/opal-store-next/.env.production` | `next build` | `NEXT_PUBLIC_*`, including the Stripe **publishable** key |
| `/var/www/opal/opal-api/.env` | phpdotenv at runtime | Optional. Compose values win over it for the same key. |

`docker-compose.yml` is committed and must stay free of environment-specific
values. It previously held production CORS origins and an SMTP password in
plaintext, which collided with every `git pull` — each collision a chance to
resolve the wrong way and re-expose the database. Everything now reads from
`/var/www/opal/.env` with a development fallback.

After editing `/var/www/opal/.env`, check the rendered result before applying:

```bash
cd /var/www/opal && sudo docker compose config | grep -E "ALLOWED_ORIGINS|STOREFRONT_URL"
```

If that shows `localhost`, the `.env` isn't being read — stop and fix it before
restarting, or you'll break CORS for the live storefront.

---

## Network

- **MongoDB has no published host port.** The API reaches it as
  `mongodb:27017` over the compose network. Publishing it on a public VPS would
  expose an unauthenticated database. For a shell:
  `sudo docker compose exec mongodb mongosh`
- Because of that, anything touching the database **must run inside the
  container**. `php db/init-prod.php` on the host cannot connect.
- The API binds `127.0.0.1:8000` only; nginx proxies to it. `BIND_ADDR` in
  `.env` overrides this, and should stay unset in production.

---

## Database

Schema and indexes: `opal-api/db/schema.md`.

To create any missing indexes (additive, safe to re-run on live data):

```bash
cd /var/www/opal && sudo docker compose exec api php db/init-prod.php
```

**Never run `seed.php` on production.** It inserts placeholder site settings and
creates a default admin account. Its advice is written for an empty cluster —
and `init-prod.php` unhelpfully suggests it on completion.

---

## Stripe

Card payment uses Checkout Sessions in embedded mode. Full setup notes are in
the README; deployment-specific points:

- Webhook endpoint is `https://api.opalperfume.com/api/stripe/webhook`, and it
  must be registered **per mode** — the test and live endpoints are separate
  and have different signing secrets.
- nginx must pass the `Stripe-Signature` header through, and the endpoint must
  not sit behind auth or an IP allowlist.
- Health check:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.opalperfume.com/api/stripe/webhook
  ```
  `400` = route live and signature verification running (what you want).
  `500` = `STRIPE_WEBHOOK_SECRET` not set. `404` = route not deployed.
- With `STRIPE_SECRET_KEY` unset the integration fails closed: the card option
  hides itself and the API rejects `card` with a 503. Cash on delivery is
  unaffected, so it is always safe to deploy this code without Stripe
  configured.

---

## Verifying a deploy

```bash
sudo docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" https://api.opalperfume.com/api/products
curl -s -o /dev/null -w "%{http_code}\n" https://opalperfume.com
pm2 list
```

Both containers `running`, both curls `200`, pm2 process `online`.

Logs when they aren't:

```bash
sudo docker compose logs api --tail 50
pm2 logs opal-store-next --lines 50
```

---

## Rolling back

```bash
cd /var/www/opal && git log --oneline -5      # find the last good commit
git checkout <sha>
```

Then re-run the deploy steps for whichever app changed. Env files are untracked
so a checkout never touches them.

---

## Secrets

The GitHub repo is **public**. Nothing secret may enter a tracked file.

A `pre-commit` hook blocks Stripe keys. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

It only catches `sk_`/`rk_` patterns — it will not save you from an SMTP
password or a JWT secret. Those belong in `/var/www/opal/.env`, `chmod 600`.

`JWT_SECRET` must be set in production. The fallback in `docker-compose.yml` is
public in this repo, and `AuthMiddleware` trusts token claims without checking
them against the database, so anything signed with a known secret grants admin
access. Rotating it logs every admin and customer out.

---

## Gaps

Things this file does not yet cover, because they haven't been confirmed:

- **How `opal-admin` is built and served.** It's a Vite app; `admin.opalperfume.com`
  is in `ALLOWED_ORIGINS`, so it is deployed somehow — but the build and serve
  steps are unrecorded.
- **The nginx vhost configs** for the three domains, and where TLS certs come
  from / how they renew.
- **Whether pm2 survives a reboot** (`pm2 startup` + `pm2 save`).
- **A stray listener on `127.0.0.1:27017`** — likely a native `mongod`
  predating the Docker setup. Unused by this app; worth identifying and
  disabling.
