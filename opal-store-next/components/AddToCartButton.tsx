'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Check } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useCart } from './CartProvider'

interface Props {
  productId: string
  productName?: string
  /** When true, render a smaller compact variant */
  compact?: boolean
}

export default function AddToCartButton({ productId, compact = false }: Props) {
  const { isLoggedIn } = useAuth()
  const { add } = useCart()
  const router   = useRouter()
  const [busy, setBusy]    = useState(false)
  const [done, setDone]    = useState(false)
  const [error, setError]  = useState('')

  async function handleClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`)
      return
    }
    setError('')
    setBusy(true)
    try {
      await add(productId, 1)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart.')
    } finally {
      setBusy(false)
    }
  }

  const sizing = compact
    ? 'py-2.5 px-5 text-xs'
    : 'py-3.5 px-8 text-sm'

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || done}
        className={`inline-flex items-center justify-center gap-2 w-full bg-gold text-white ${sizing} font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors disabled:opacity-80`}
      >
        {done ? (
          <>
            <Check className="w-4 h-4" />
            Added to cart
          </>
        ) : busy ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Adding…
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            Add to cart
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
