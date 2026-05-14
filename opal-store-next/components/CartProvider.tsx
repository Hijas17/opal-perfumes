'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import {
  addCartItem, clearCart as apiClearCart, emptyCart,
  fetchCart, removeCartItem, updateCartItem,
} from '@/lib/customer-api'
import type { Cart } from '@/lib/types'
import { useAuth } from './AuthProvider'

interface CartContextValue {
  cart:    Cart
  loading: boolean
  add:     (productId: string, quantity?: number) => Promise<void>
  update:  (productId: string, quantity: number)  => Promise<void>
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

export default function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth()
  const [cart, setCart]       = useState<Cart>(emptyCart())
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(emptyCart())
      return
    }
    setLoading(true)
    try {
      const c = await fetchCart()
      setCart(c)
    } catch {
      setCart(emptyCart())
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  // Refresh on mount + whenever auth state changes
  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (productId: string, quantity = 1) => {
    setCart(await addCartItem(productId, quantity))
  }, [])

  const update = useCallback(async (productId: string, quantity: number) => {
    setCart(await updateCartItem(productId, quantity))
  }, [])

  const remove = useCallback(async (productId: string) => {
    setCart(await removeCartItem(productId))
  }, [])

  const clear = useCallback(async () => {
    setCart(await apiClearCart())
  }, [])

  return (
    <CartContext.Provider value={{ cart, loading, add, update, remove, clear, refresh }}>
      {children}
    </CartContext.Provider>
  )
}
