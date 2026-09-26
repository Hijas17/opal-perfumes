/* ──────────────────────────────────────────────────────────────────────────
   Shared TypeScript types — mirror the PHP API response shapes.
   These collections live in MongoDB; the API returns plain JSON.
   ────────────────────────────────────────────────────────────────────────── */

export type ProductLabel = 'new' | 'bestseller' | 'limited edition' | 'featured' | null

export interface ProductImages {
  primary?: string | null
  hover?: string | null
  gallery?: string[] | null
  ingredients?: string | null
}

export interface ScentNotes {
  top?: string | null
  middle?: string | null
  base?: string | null
}

export interface PurchaseLink {
  platform: string
  url: string
}

export interface Product {
  id?: string
  _id?: string
  name: string
  slug: string

  subcategory_id?: string
  subcategory_slug?: string
  subcategory_name?: string
  category?: { slug?: string; name?: string }

  short_description?: string
  full_description?: string

  scent_notes?: ScentNotes
  seo_keywords?: string[]
  /** Admin overrides for the product page's <title> and meta description.
   *  Empty means "generate one" — see generateMetadata on the product page. */
  meta_title?: string
  meta_description?: string
  size_volume?: string

  price?: number | string | null
  currency?: string

  purchase_links?: PurchaseLink[] | PurchaseLink

  images?: ProductImages

  label?: ProductLabel
  is_featured?: boolean
  display_order?: number
  status?: 'published' | 'draft'

  created_at?: string
  updated_at?: string
}

export interface Category {
  id?: string
  _id?: string
  name: string
  slug: string
  description?: string
  /** Filename in the uploads store — run it through getImageUrl(). */
  image?: string
  display_order?: number
}

/* ── Admin-managed home page media ──────────────────────────────────────────
   Stored in site_settings as whole JSON values (arrays/objects) rather than
   scalars, so one setting key holds an entire repeatable section. Every
   `image` is a bare filename — pass it through getImageUrl(). */

export interface HeroSlideSetting {
  image?: string
  eyebrow?: string
  headline?: string
  subtext?: string
  cta_label?: string
  cta_href?: string
}

/**
 * A promotional banner shown in the strip under the navbar on the home page.
 *
 * `promo_code` is display-only — it tells the shopper what to type at
 * checkout. The code's rules live in the `coupons` collection, never here,
 * so a banner can never grant a discount by itself.
 */
export interface PromoBannerSetting {
  image?: string
  headline?: string
  subtext?: string
  promo_code?: string
  /** Defaults to the product listing page when unset. */
  href?: string
}

export interface CompareSideSetting {
  image?: string
  label?: string
  href?: string
}

export interface HomeCompareSetting {
  before?: CompareSideSetting
  after?: CompareSideSetting
}

export interface SiteSettings {
  // Brand
  brand_name?: string
  footer_tagline?: string
  currency?: string

  // Shipping (admin Settings → Shipping; see lib/shipping.ts). Numbers once
  // saved from the admin; a blank threshold means no free-shipping level.
  shipping_fee?: number | string
  free_shipping_threshold?: number | string | null

  // Contact
  contact_email?: string
  contact_phone?: string
  address?: string
  whatsapp_number?: string

  // Social
  facebook_url?: string
  instagram_url?: string
  youtube_url?: string

  // Hero
  hero_image?: string
  hero_bottle_image?: string
  hero_tagline?: string
  hero_headline?: string
  hero_subtext?: string

  // Home page media (admin-managed, see the interfaces above)
  /** Backdrop filenames for the three backdropped home-page sections. */
  home_featured_bg?: string
  home_bestsellers_bg?: string
  home_collections_bg?: string
  home_hero_slides?: HeroSlideSetting[]
  promo_banners?: PromoBannerSetting[]
  /** Master switch — the strip is hidden entirely when this is not true. */
  promo_banners_enabled?: boolean
  home_compare?: HomeCompareSetting

  // About / Home
  about_snippet?: string
  cta_message?: string
  about_hero_image?: string
  /** Heading above the brand story. Falls back to brand_name when empty. */
  about_story_heading?: string
  brand_story?: string
  mission_statement?: string
  founder_photo?: string
  founder_bio?: string

  [key: string]: unknown
}

export interface InquiryPayload {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  honeypot?: string
}

/** Generic API envelope — many endpoints return `{ data: T, error: false }` */
export interface ApiEnvelope<T> {
  data?: T
  error?: boolean
  message?: string
}

// ─── Customer / cart / order types ───────────────────────────────────────────

export interface Customer {
  id:      string
  name:    string
  email:   string
  phone?:  string
  address?: string | null
}

export interface CartItem {
  product_id:        string
  name:              string
  slug:              string
  subcategory_slug?: string | null
  price:             number
  currency:          string
  image?:            string | null
  quantity:          number
}

export interface Cart {
  items:      CartItem[]
  subtotal:   number
  item_count: number
  currency:   string
}

export interface ShippingDetails {
  name:    string
  phone:   string
  email?:  string
  address: string
  city:    string
  country: string
  notes?:  string
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderStatusEntry {
  status: string
  note?:  string
  at:     string | null
}

/** Stripe details attached to a card order. Null for cash on delivery. */
export interface OrderPayment {
  stripe_session_id: string | null
  /** ISO timestamp set by the webhook when payment actually landed. */
  paid_at:           string | null
}

/**
 * Result of placing an order.
 *
 * `clientSecret` is present only for `card`, and its presence is what tells
 * the checkout page to mount embedded Checkout instead of going straight to
 * the success page.
 */
export interface PlacedOrder {
  order:        Order
  clientSecret: string | null
}

/** What a promo code was worth on a given order. Null when none was used. */
export interface OrderCoupon {
  code:     string
  discount: number
}

/** Result of checking a promo code against the current cart. */
export interface CouponCheck {
  ok:       boolean
  message:  string
  code:     string
  discount: number
}

export interface Order {
  id:              string
  order_number:    string
  items:           CartItem[]
  subtotal:        number
  discount:        number
  coupon:          OrderCoupon | null
  shipping_fee:    number
  total:           number
  currency:        string
  payment_method:  string
  payment_status:  string
  payment:         OrderPayment | null
  shipping:        ShippingDetails
  status:          OrderStatus
  status_history:  OrderStatusEntry[]
  created_at:      string | null
  updated_at:      string | null
}
