'use client'

/**
 * Cart-drawer state, for every breakpoint.
 *
 * The mobile tree used to carry its own drawer; that has been folded into this
 * one, so there is a single cart drawer site-wide.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import CartDrawer from './CartDrawer'

interface CartDrawerState {
  open: boolean
  openCart: () => void
  closeCart: () => void
}

const Ctx = createContext<CartDrawerState | null>(null)

export function useCartDrawer(): CartDrawerState {
  const ctx = useContext(Ctx)
  // Deliberately forgiving: the mobile tree renders cards outside this provider,
  // so a missing provider is a no-op rather than a crash.
  return ctx ?? { open: false, openCart: () => {}, closeCart: () => {} }
}

export default function CartDrawerProvider({
  children,
  whatsappNumber,
  freeShippingThreshold,
}: {
  children: ReactNode
  whatsappNumber?: string
  freeShippingThreshold?: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const closeCart = useCallback(() => setOpen(false), [])
  const openCart = useCallback(() => setOpen(true), [])

  // Close on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock scroll + close on Escape while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <Ctx.Provider value={{ open, openCart, closeCart }}>
      {children}
      <CartDrawer
        open={open}
        onClose={closeCart}
        whatsappNumber={whatsappNumber}
        freeShippingThreshold={freeShippingThreshold}
      />
    </Ctx.Provider>
  )
}
