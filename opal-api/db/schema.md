# Opal Perfumes — MongoDB Schema Reference

> MongoDB is schema-less in the strict sense — documents are stored as BSON
> with no enforced structure. This document is the **authoritative reference**
> for what every collection should contain, plus the indexes that guarantee
> query performance and uniqueness constraints.
>
> Source of truth for indexes: [`init-prod.php`](./init-prod.php).
> When you add a new field or collection to the app, **update this file in the
> same commit** as the controller change.

---

## Conventions

- **`_id`** — always a `MongoDB\BSON\ObjectId` unless noted
- **`created_at` / `updated_at`** — always `MongoDB\BSON\UTCDateTime`
- **Soft delete** is NOT used — deletes are hard
- **Slugs** — URL-safe, lowercase, hyphenated, unique per collection
- **Currency codes** — ISO 4217 (`AED`, `USD`, `EUR`, `SAR`, `GBP`)
- **Status enums** — stored as lowercase strings (`published`, `draft`, `pending`)

---

## Collections

### `admin_users`

Internal staff who log into the admin portal.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `name` | string | ✓ | Display name |
| `email` | string | ✓ | Lowercase, **unique** |
| `password_hash` | string | ✓ | `password_hash(…, PASSWORD_BCRYPT)` |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**Indexes**
- `{ email: 1 }` **unique**

---

### `customers`

Public-facing customer accounts (created via `/api/customer/register`).

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `name` | string | ✓ | |
| `email` | string | ✓ | Lowercase, **unique** |
| `phone` | string | ✗ | E.164 format preferred (`+971501234567`) |
| `password_hash` | string | ✓ | bcrypt |
| `address` | object \| null | ✗ | Default shipping address (free-form for now) |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**Indexes**
- `{ email: 1 }` **unique**
- `{ created_at: -1 }`

---

### `subcategories`

The Products → Perfume / Buhoor dropdown. Admin-managed.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `name` | string | ✓ | Display name |
| `slug` | string | ✓ | URL slug, **unique** |
| `description` | string | ✗ | Optional |
| `display_order` | int | ✓ | Sort order, lower = first |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**Indexes**
- `{ slug: 1 }` **unique**
- `{ display_order: 1 }`

---

### `products`

Customer-visible products. Admin CRUD via `/api/admin/products`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `name` | string | ✓ | |
| `slug` | string | ✓ | URL slug, **unique** |
| `subcategory_id` | ObjectId | ✓ | FK → `subcategories._id` |
| `subcategory_slug` | string | ✗ | Denormalised for fast public reads |
| `subcategory_name` | string | ✗ | Denormalised |
| `short_description` | string | ✗ | Listing + meta description (≤ 200 chars) |
| `full_description` | string | ✗ | HTML allowed (sanitised) |
| `scent_notes` | object | ✗ | `{ top, middle, base }` — each a comma-separated string |
| `price` | float | ✗ | 2 decimal places |
| `currency` | string | ✗ | ISO 4217, defaults to site settings `default_currency` |
| `size_volume` | string | ✗ | e.g. `"50ml / 100ml"` |
| `images` | object | ✗ | See below |
| `purchase_links` | array | ✗ | `[{ platform: 'Noon', url: 'https://…' }]` |
| `label` | string \| null | ✗ | Enum: `null`, `new`, `bestseller`, `limited edition`, `featured` |
| `is_featured` | bool | ✓ | Default `false`. Appears on homepage |
| `display_order` | int | ✗ | Manual sort |
| `status` | string | ✓ | Enum: `published`, `draft` |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**`images` object**

```jsonc
{
  "primary":     "img_abc123.png",   // shown by default on cards
  "hover":       "img_def456.png",   // crossfade on hover
  "ingredients": "img_ghi789.png",   // ingredients/notes graphic
  "gallery":     ["img_jkl012.png", "img_mno345.png"]
}
```

Each value is a **filename** (the API serves it from `/uploads/<filename>`) **or** an absolute external URL (bulk import via Google Drive uses absolute URLs).

**Indexes**
- `{ slug: 1 }` **unique**
- `{ status: 1 }`
- `{ subcategory_id: 1 }`
- `{ created_at: -1 }`
- `{ is_featured: 1 }`

---

### `site_settings`

Key-value store editable from admin → Settings.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `key` | string | ✓ | **unique** |
| `value` | mixed | ✓ | string \| object \| array |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**Known keys** (read by the storefront via `/api/settings`)

| Key | Type | Where it's used |
|---|---|---|
| `brand_name` | string | navbar/footer |
| `footer_tagline` | string | footer |
| `default_currency` | string (ISO 4217) | product prices |
| `contact_email`, `contact_phone`, `address`, `whatsapp_number` | string | contact page + footer |
| `facebook_url`, `instagram_url`, `youtube_url` | string | footer social icons |
| `hero_title`, `hero_subtitle`, `hero_cta_text`, `hero_cta_url` | string | hero scene 1 |
| `hero_image`, `hero_bottle_image` | string (filename) | hero background + product image |
| `about_title`, `about_description`, `about_image` | string | About Us page |
| `cta_message`, `about_snippet` | string | Home page sections |

**Public exposure** is controlled by `SettingsController::PUBLIC_KEYS`. Adding a new key the storefront should read also requires updating that list.

**Indexes**
- `{ key: 1 }` **unique**

---

### `inquiries`

Submissions from the Contact Us form.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `name` | string | ✓ | |
| `email` | string | ✓ | |
| `phone` | string | ✗ | |
| `subject` | string | ✗ | Pre-filled from product detail page when applicable |
| `message` | string | ✓ | |
| `is_read` | bool | ✓ | Default `false` |
| `ip` | string | ✗ | Submitter IP (for rate-limiting) |
| `created_at` | UTCDateTime | ✓ | |

**Indexes**
- `{ created_at: -1 }`
- `{ ip: 1, created_at: -1 }` (rate-limit: 5 submissions / IP / hour)
- `{ is_read: 1 }`

---

### `carts`

One document per customer — their current shopping cart.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `customer_id` | ObjectId | ✓ | FK → `customers._id`, **unique** (1 cart / customer) |
| `items` | array of objects | ✓ | See below. May be empty |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**Cart item object**

```jsonc
{
  "product_id":       "<ObjectId as string>",
  "name":             "Opal III AM",
  "slug":             "opal-iii-am",
  "subcategory_slug": "perfume",
  "price":            150.00,             // float — price at the time the item was added
  "currency":         "AED",
  "image":            "img_xxx.png",      // filename or absolute URL
  "quantity":         2
}
```

Items are **denormalised snapshots** — the customer's cart shouldn't change price if the product is edited mid-session.

**Indexes**
- `{ customer_id: 1 }` **unique**

---

### `orders`

Placed orders. One document per order.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✓ | |
| `customer_id` | ObjectId | ✓ | FK → `customers._id` |
| `order_number` | string | ✓ | **unique**, format `OPL-YYYYMMDD-XXXXX` |
| `items` | array | ✓ | Same shape as cart items above |
| `subtotal` | float | ✓ | Sum of `price × quantity` for all items |
| `shipping_fee` | float | ✓ | Currently always `0` (free shipping). Future: tiered |
| `total` | float | ✓ | `subtotal + shipping_fee` |
| `currency` | string | ✓ | ISO 4217 |
| `payment_method` | string | ✓ | Enum: `cod`. Future: `card`, `applepay`, etc. |
| `payment_status` | string | ✓ | Enum: `pending`, `paid`, `refunded`, `failed` |
| `shipping` | object | ✓ | See below |
| `status` | string | ✓ | Enum: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |
| `status_history` | array of objects | ✓ | `[{ status, note, at: UTCDateTime }, …]` — audit trail |
| `created_at` | UTCDateTime | ✓ | |
| `updated_at` | UTCDateTime | ✓ | |

**`shipping` object**

```jsonc
{
  "name":    "Hijas Salam",
  "phone":   "+971501234567",
  "email":   "hijas@example.com",
  "address": "Apt 12, Sheikh Zayed Rd",
  "city":    "Dubai",
  "country": "UAE",
  "notes":   ""
}
```

**Indexes**
- `{ customer_id: 1, created_at: -1 }` — fast order history lookup
- `{ order_number: 1 }` **unique**
- `{ status: 1 }` — admin filter

---

## Bootstrap a fresh production cluster

```bash
# 1. Create the M0/M10 cluster on Atlas, get the connection string

# 2. Set env vars
export MONGO_URI="mongodb+srv://USER:PASS@<cluster>/?retryWrites=true&w=majority"
export MONGO_DB="opal_perfumes"

# 3. Create collections + indexes — does NOT insert any sample data
php db/init-prod.php

# 4. Create your real admin user (NOT the default test one)
php create-admin.php you@yourcompany.com 'YourRealStrongPassword!' 'Your Name'

# 5. Populate site settings via the admin portal Settings page
#    OR seed defaults if you want them: php seed.php (creates the test admin too)
```

---

## Migrating from staging Atlas → production Atlas

```bash
# Export staging
mongodump --uri="mongodb+srv://<stg-uri>" --out=./dump

# Restore into prod (drops + recreates each collection)
mongorestore --uri="mongodb+srv://<prod-uri>" --drop ./dump/opal_perfumes

# Re-run init to ensure all indexes exist in prod
php db/init-prod.php
```

⚠️ `mongorestore --drop` overwrites the destination — only use on a fresh prod cluster.
