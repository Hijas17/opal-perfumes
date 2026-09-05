'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

import { useCart } from './CartProvider'
import { useCartDrawer } from './CartDrawerProvider'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  /** Units to add. Defaults to 1 so callers without a stepper keep working. */
  quantity?: number
  /** Open the cart drawer after adding (as the reference does). */
  openDrawerOnAdd?: boolean
  label?: string
}

export default function AddToCartButton({
  product,
  quantity = 1,
  openDrawerOnAdd = true,
  label = 'Add to cart',
}: Props) {
  const { add } = useCart()
  const { openCart } = useCartDrawer()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setError('')
    setBusy(true)
    try {
      await add(product, quantity)
      setDone(true)
      if (openDrawerOnAdd) openCart()
      window.setTimeout(() => setDone(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      <button type="button" onClick={handleClick} disabled={busy || done} className="btn w-full">
        {done ? (
          <>
            <Check className="h-4 w-4" />
            Added to cart
          </>
        ) : busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Adding…
          </>
        ) : (
          label
        )}
      </button>
      {error && <p className="mt-2 text-xs text-sale">{error}</p>}
    </div>
  )
}
