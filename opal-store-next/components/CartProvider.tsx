'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import type { Cart, CartItem, Product } from '@/lib/types'

const STORAGE_KEY = 'opal:cart:v1'

interface CartContextValue {
  cart:    Cart
  loading: boolean
  add:     (product: Product, quantity?: number) => Promise<void>
  update:  (productId: string, quantity: number) => Promise<void>
  remove:  (productId: string) => Promise<void>
  clear:   () => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

function emptyCart(): Cart {
  return { items: [], subtotal: 0, item_count: 0, currency: 'AED' }
}

function computeTotals(items: CartItem[]): Cart {
  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * it.quantity, 0)
  const item_count = items.reduce((n, it) => n + it.quantity, 0)
  const currency = items[0]?.currency || 'AED'
  return { items, subtotal, item_count, currency }
}

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage may be full or blocked — cart still works in-memory for this session.
  }
}

function productToCartItem(product: Product, quantity: number): CartItem {
  const productId = product.id || product._id || product.slug
  const price = typeof product.price === 'number'
    ? product.price
    : parseFloat(String(product.price ?? '0')) || 0
  return {
    product_id: productId,
    name: product.name,
    slug: product.slug,
    subcategory_slug: product.subcategory_slug || product.category?.slug || null,
    price,
    currency: product.currency || 'AED',
    image: product.images?.primary || null,
    quantity,
  }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart]       = useState<Cart>(emptyCart())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setCart(computeTotals(readStorage()))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCart(computeTotals(readStorage()))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback(async (product: Product, quantity = 1) => {
    const item = productToCartItem(product, quantity)
    const items = readStorage()
    const idx = items.findIndex((i) => i.product_id === item.product_id)
    if (idx >= 0) {
      items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity }
    } else {
      items.push(item)
    }
    writeStorage(items)
    setCart(computeTotals(items))
  }, [])

  const update = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) return
    const items = readStorage().map((it) =>
      it.product_id === productId ? { ...it, quantity } : it,
    )
    writeStorage(items)
    setCart(computeTotals(items))
  }, [])

  const remove = useCallback(async (productId: string) => {
    const items = readStorage().filter((it) => it.product_id !== productId)
    writeStorage(items)
    setCart(computeTotals(items))
  }, [])

  const clear = useCallback(async () => {
    writeStorage([])
    setCart(emptyCart())
  }, [])

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, clear, refresh }}>
      {children}
    </CartContext.Provider>
  )
}
