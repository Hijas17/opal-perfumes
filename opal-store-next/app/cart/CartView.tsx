'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import { showPrices } from '@/lib/config'

export default function CartView() {
  const { isLoggedIn, loading: authLoading } = useAuth()
  const { cart, loading, update, remove } = useCart()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  // Loading auth state
  if (authLoading) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="pt-[70px] min-h-screen bg-cream">
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-gray-300" />
          <h1 className="font-display text-3xl font-semibold text-[#1a1a1a] mb-3">Your cart</h1>
          <p className="text-gray-500 mb-8">Sign in to view your cart and check out.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login?next=/cart"
              className="inline-block bg-gold text-white px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors">
              Sign In
            </Link>
            <Link href="/signup?next=/cart"
              className="inline-block border border-gold text-gold px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Empty cart
  if (!loading && cart.items.length === 0) {
    return (
      <div className="pt-[70px] min-h-screen bg-cream">
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-gray-300" />
          <h1 className="font-display text-3xl font-semibold text-[#1a1a1a] mb-3">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">Browse our collection and find your signature scent.</p>
          <Link href="/products"
            className="inline-block bg-gold text-white px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors">
            Shop Perfumes
          </Link>
        </div>
      </div>
    )
  }

  async function changeQty(productId: string, q: number) {
    if (q < 1) return
    setBusyId(productId)
    try { await update(productId, q) } finally { setBusyId(null) }
  }

  async function removeItem(productId: string) {
    setBusyId(productId)
    try { await remove(productId) } finally { setBusyId(null) }
  }

  return (
    <div className="pt-[70px] min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-4xl font-semibold text-[#1a1a1a] mb-8">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const img = item.image ? getImageUrl(item.image) : null
              const link = `/products/${item.subcategory_slug || 'all'}/${item.slug}`
              const lineTotal = item.price * item.quantity
              const isBusy = busyId === item.product_id

              return (
                <div key={item.product_id} className="flex gap-4 bg-white border border-gray-100 rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)]">
                  <Link href={link} className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 bg-cream rounded-[var(--radius-card)] overflow-hidden relative">
                    {img ? (
                      <Image src={img} alt={item.name} fill sizes="112px" className="object-cover" />
                    ) : null}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <Link href={link} className="font-display font-medium text-base text-[#1a1a1a] hover:text-gold transition-colors line-clamp-2">
                      {item.name}
                    </Link>
                    {showPrices && (
                      <p className="text-sm text-gold font-semibold mt-1">{formatPrice(item.price, item.currency)}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center border border-gray-200 rounded-full">
                        <button type="button" onClick={() => changeQty(item.product_id, item.quantity - 1)}
                          disabled={isBusy || item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gold disabled:opacity-30">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button type="button" onClick={() => changeQty(item.product_id, item.quantity + 1)}
                          disabled={isBusy}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gold disabled:opacity-30">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.product_id)} disabled={isBusy}
                        className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showPrices && (
                    <div className="hidden sm:flex flex-col items-end justify-between">
                      <p className="font-medium text-[#1a1a1a]">{formatPrice(lineTotal, item.currency)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-cream rounded-[var(--radius-card)] p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold text-[#1a1a1a] mb-4">Order Summary</h2>
              <dl className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><dt className="text-gray-600">Items</dt><dd className="font-medium">{cart.item_count}</dd></div>
                {showPrices && (
                  <>
                    <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="font-medium">{formatPrice(cart.subtotal, cart.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-600">Shipping</dt><dd className="font-medium text-green-700">Free</dd></div>
                  </>
                )}
              </dl>
              {showPrices && (
                <div className="border-t border-gray-200 pt-3 mb-6 flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-gold">{formatPrice(cart.subtotal, cart.currency)}</span>
                </div>
              )}
              <button type="button" onClick={() => router.push('/checkout')}
                className="w-full bg-gold text-white py-3.5 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors">
                Checkout
              </button>
              <Link href="/products" className="block text-center text-sm text-gray-500 mt-4 hover:text-gold transition-colors">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
