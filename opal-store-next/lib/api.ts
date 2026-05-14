/* ──────────────────────────────────────────────────────────────────────────
   Server-friendly typed API client (uses native fetch — works in Server
   Components AND Client Components). All GET helpers participate in Next.js
   data caching; tweak `revalidate` per call when you want fresher data.
   ────────────────────────────────────────────────────────────────────────── */

import type {
  ApiEnvelope,
  Category,
  InquiryPayload,
  Product,
  SiteSettings,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface FetchOptions {
  revalidate?: number | false
  tags?: string[]
}

async function apiGet<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { revalidate = 60, tags } = opts
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate, tags },
  })
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(err?.message || `API ${path} returned ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Unwrap `{ data: T }` envelope OR direct array — public API is inconsistent. */
function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return ((payload as ApiEnvelope<T>).data ?? payload) as T
  }
  return payload as T
}

// ─── Public reads ────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SiteSettings> {
  const raw = await apiGet<ApiEnvelope<SiteSettings>>('/settings', { revalidate: 300, tags: ['settings'] })
  return unwrap(raw) || {}
}

export async function getCategories(): Promise<Category[]> {
  const raw = await apiGet<ApiEnvelope<Category[]>>('/categories', { revalidate: 600, tags: ['categories'] })
  const data = unwrap(raw)
  return Array.isArray(data) ? data : []
}

export interface ProductQuery {
  category?: string
  search?: string
  featured?: boolean
  sort?: string
  limit?: number
}

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.search)   params.set('search',   query.search)
  if (query.featured) params.set('featured', '1')
  if (query.sort)     params.set('sort',     query.sort)
  if (query.limit)    params.set('limit',    String(query.limit))
  const qs = params.toString()
  const raw = await apiGet<ApiEnvelope<Product[]>>(
    `/products${qs ? `?${qs}` : ''}`,
    { revalidate: 60, tags: ['products'] }
  )
  const data = unwrap(raw)
  return Array.isArray(data) ? data : []
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    const raw = await apiGet<ApiEnvelope<Product>>(`/products/${encodeURIComponent(slug)}`, {
      revalidate: 120,
      tags: [`product:${slug}`],
    })
    const data = unwrap(raw)
    return data && data.name ? data : null
  } catch {
    return null
  }
}

// ─── Public writes ───────────────────────────────────────────────────────────

export async function submitInquiry(payload: InquiryPayload) {
  return apiPost<ApiEnvelope<unknown>>('/inquiries', payload)
}
