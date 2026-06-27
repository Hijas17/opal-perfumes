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
  display_order?: number
}

export interface SiteSettings {
  // Brand
  brand_name?: string
  footer_tagline?: string
  currency?: string

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

  // About / Home
  about_snippet?: string
  cta_message?: string
  about_hero_image?: string
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

export interface Order {
  id:              string
  order_number:    string
  items:           CartItem[]
  subtotal:        number
  shipping_fee:    number
  total:           number
  currency:        string
  payment_method:  string
  payment_status:  string
  shipping:        ShippingDetails
  status:          OrderStatus
  status_history:  OrderStatusEntry[]
  created_at:      string | null
  updated_at:      string | null
}
