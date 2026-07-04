'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { X, Minus, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import { showPrices, buildWhatsAppUrl, buildCartInquiryMessage, whatsappFallback } from '@/lib/config'
import { useCart } from '../CartProvider'
import WhatsAppIcon from '../WhatsAppIcon'

const FREE_SHIPPING_THRESHOLD = 499

interface Props {
  open: boolean
  onClose: () => void
  whatsappNumber?: string
}

export default function MobileCartDrawer({ open, onClose, whatsappNumber }: Props) {
  const { cart, update, remove } = useCart()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function changeQty(productId: string, q: number) {
    if (q < 1) return
    setBusyId(productId)
    try { await update(productId, q) } finally { setBusyId(null) }
  }

  async function removeItem(productId: string) {
    setBusyId(productId)
    try { await remove(productId) } finally { setBusyId(null) }
  }

  const currency = cart.currency || 'AED'
  const isEmpty = cart.items.length === 0
  const waNumber = whatsappNumber || whatsappFallback
  const waHref = waNumber
    ? buildWhatsAppUrl(waNumber, buildCartInquiryMessage(cart.items))
    : null

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-[92%] max-w-[440px] bg-white shadow-xl',
          'transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Shopping Cart</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="p-1 text-[#1a1a1a] hover:text-gold transition-colors"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {cart.item_count} {cart.item_count === 1 ? 'item' : 'items'}
          </p>
        </header>

        {showPrices && (
          <div className="px-5 py-4 text-sm text-gray-600 border-b border-gray-100">
            Free shipping for all orders over {currency}. {FREE_SHIPPING_THRESHOLD.toFixed(2)}!
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex items-center justify-center px-6 py-16">
              <p className="text-gray-400 text-base">Your cart is empty</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.items.map((item) => {
                const img = item.image ? getImageUrl(item.image) : null
                const link = `/products/${item.subcategory_slug || 'all'}/${item.slug}`
                const isBusy = busyId === item.product_id
                return (
                  <li key={item.product_id} className="flex gap-3 px-5 py-4">
                    <Link
                      href={link}
                      onClick={onClose}
                      className="flex-shrink-0 w-20 h-20 bg-cream rounded-[var(--radius-card)] overflow-hidden relative"
                    >
                      {img && <Image src={img} alt={item.name} fill sizes="80px" className="object-cover" />}
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <Link
                        href={link}
                        onClick={onClose}
                        className="font-display font-medium text-sm text-[#1a1a1a] line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      {showPrices && (
                        <p className="text-sm text-gold font-semibold mt-0.5">
                          {formatPrice(item.price, item.currency)}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center border border-gray-200 rounded-full">
                          <button
                            type="button"
                            onClick={() => changeQty(item.product_id, item.quantity - 1)}
                            disabled={isBusy || item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQty(item.product_id, item.quantity + 1)}
                            disabled={isBusy}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product_id)}
                          disabled={isBusy}
                          aria-label="Remove item"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-gray-100 p-5 space-y-3">
          {isEmpty ? (
            <Link
              href="/products"
              onClick={onClose}
              className="block w-full border border-gray-200 bg-gray-50 text-[#1a1a1a] py-4 text-center text-sm font-semibold tracking-widest uppercase"
            >
              Continue Shopping
            </Link>
          ) : (
            <>
              {showPrices && (
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-[#1a1a1a]">Subtotal</span>
                  <span className="font-semibold text-gold">{formatPrice(cart.subtotal, cart.currency)}</span>
                </div>
              )}
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2.5 w-full bg-[#1a1a1a] text-white py-4 text-center text-sm font-semibold tracking-widest uppercase rounded-[var(--radius-btn)] hover:bg-black transition-colors"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                  Send Inquiry via WhatsApp
                </a>
              ) : (
                <p className="text-xs text-red-500 text-center">WhatsApp number not configured.</p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="block w-full border border-gray-200 py-3.5 text-center text-sm text-gray-600"
              >
                Continue Shopping
              </button>
            </>
          )}
        </footer>
      </aside>
    </>
  )
}
