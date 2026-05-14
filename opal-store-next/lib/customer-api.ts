'use client'

/* ──────────────────────────────────────────────────────────────────────────
   Customer-side API client. Browser only — uses the JWT stored in localStorage.
   Server Components should NOT import from here; they call lib/api.ts which
   uses unauthenticated public endpoints with caching.
   ────────────────────────────────────────────────────────────────────────── */

import type {
  ApiEnvelope,
  Cart,
  Customer,
  Order,
  ShippingDetails,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const TOKEN_KEY = 'opal_customer_token'

// ─── Token storage ───────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
}

// ─── Low-level fetch helper ──────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean   // attach Authorization header (default true)
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || (json && json.error === true)) {
    throw new Error(json?.message || `Request failed (${res.status})`)
  }
  return json as T
}

// ─── Auth ────────────────────────────────────────────────────────────────

export async function customerRegister(input: {
  name:     string
  email:    string
  password: string
  phone?:   string
}): Promise<{ token: string; customer: Customer }> {
  const r = await request<{ token: string; customer: Customer }>(
    '/customer/register',
    { method: 'POST', body: input, auth: false }
  )
  setToken(r.token)
  return r
}

export async function customerLogin(email: string, password: string): Promise<{ token: string; customer: Customer }> {
  const r = await request<{ token: string; customer: Customer }>(
    '/customer/login',
    { method: 'POST', body: { email, password }, auth: false }
  )
  setToken(r.token)
  return r
}

export async function customerLogout(): Promise<void> {
  // Stateless JWT — just discard the token
  clearToken()
}

export async function fetchMe(): Promise<Customer> {
  const r = await request<ApiEnvelope<Customer>>('/customer/me')
  if (!r.data) throw new Error('No profile data returned')
  return r.data
}

export async function updateProfile(input: Partial<Pick<Customer, 'name' | 'phone' | 'address'>>): Promise<void> {
  await request<ApiEnvelope<unknown>>('/customer/me', { method: 'PUT', body: input })
}

// ─── Cart ────────────────────────────────────────────────────────────────

export async function fetchCart(): Promise<Cart> {
  const r = await request<ApiEnvelope<Cart>>('/customer/cart')
  return r.data || emptyCart()
}

export async function addCartItem(productId: string, quantity = 1): Promise<Cart> {
  const r = await request<ApiEnvelope<Cart>>('/customer/cart/items', {
    method: 'POST',
    body: { product_id: productId, quantity },
  })
  return r.data || emptyCart()
}

export async function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  const r = await request<ApiEnvelope<Cart>>(`/customer/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: { quantity },
  })
  return r.data || emptyCart()
}

export async function removeCartItem(productId: string): Promise<Cart> {
  const r = await request<ApiEnvelope<Cart>>(`/customer/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
  return r.data || emptyCart()
}

export async function clearCart(): Promise<Cart> {
  const r = await request<ApiEnvelope<Cart>>('/customer/cart', { method: 'DELETE' })
  return r.data || emptyCart()
}

export function emptyCart(): Cart {
  return { items: [], subtotal: 0, item_count: 0, currency: 'AED' }
}

// ─── Orders ──────────────────────────────────────────────────────────────

export async function placeOrder(payload: {
  shipping:        ShippingDetails
  payment_method?: string
}): Promise<Order> {
  const r = await request<ApiEnvelope<Order>>('/customer/orders', {
    method: 'POST',
    body: { ...payload, payment_method: payload.payment_method || 'cod' },
  })
  if (!r.data) throw new Error('No order returned')
  return r.data
}

export async function fetchOrders(): Promise<Order[]> {
  const r = await request<ApiEnvelope<Order[]>>('/customer/orders')
  return r.data || []
}

export async function fetchOrder(id: string): Promise<Order> {
  const r = await request<ApiEnvelope<Order>>(`/customer/orders/${encodeURIComponent(id)}`)
  if (!r.data) throw new Error('Order not found')
  return r.data
}
