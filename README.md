# Opal Perfumes

Luxury Arabian fragrance e-commerce platform — UAE-based.

## Apps

| Folder | Stack | Purpose |
|---|---|---|
| **`opal-api/`** | PHP 8.4 + Slim 4 + MongoDB | REST API (products, categories, customers, cart, orders, settings, media) |
| **`opal-admin/`** | React + Vite + Tailwind | Admin portal — product, category, order & content management |
| **`opal-store-next/`** | Next.js 16 + TypeScript + Tailwind | Customer-facing storefront with SSR/SEO and Apple-style scroll hero |

## Local development

```bash
# Start MongoDB + API
docker compose up -d

# Customer store (Next.js)  → http://localhost:3000
cd opal-store-next && npm install && npm run dev

# Admin portal (Vite)        → http://localhost:5174
cd opal-admin && npm install && npm run dev -- --port 5174 --strictPort
```

API: `http://localhost:8000/api`
Default admin: `admin@opalperfumes.com / Admin@1234`

## Features

- Server-rendered storefront with JSON-LD product schema for SEO
- Scroll-driven hero with 192-frame WebP sequence
- Apple-style preloader and scene transitions
- Customer auth (JWT) — register, login, profile
- Cart and orders (cash on delivery; payment gateway pending)
- Admin: product CRUD, bulk import (Excel + Google Drive URLs), media library, site settings, inquiries
