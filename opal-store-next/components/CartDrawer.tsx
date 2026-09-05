'use client'

/**
 * Cart drawer — 450px, right-anchored, black, over a 40% scrim.
 *
 * Follows the reference's drawer anatomy: header / free-shipping bar /
 * line items (120px square thumbs, small quantity stepper, Remove link) /
 * order-note dialog / footer with "View cart" + the terminal CTA.
 *
 * With `USE_WHATSAPP_INQUIRY` on (the shipped default) the terminal action is a
 * WhatsApp inquiry rather than a checkout submit — the reference's Checkout
 * button occupies the same slot.
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'

import { useCart } from './CartProvider'
import { getImageUrl } from '@/lib/image'
import {
  showPrices,
  useWhatsAppInquiry,
  buildWhatsAppUrl,
  buildCartInquiryMessage,
  whatsappFallback,
} from '@/lib/config'
import FreeShippingBar from './FreeShippingBar'
import QuantitySelector from './QuantitySelector'
import { useMoney } from './CurrencyProvider'

const DEFAULT_THRESHOLD = 250

interface Props {
  open: boolean
  onClose: () => void
  whatsappNumber?: string
  freeShippingThreshold?: number
}

export default function CartDrawer({
  open,
  onClose,
  whatsappNumber,
  freeShippingThreshold = DEFAULT_THRESHOLD,
}: Props) {
  const money = useMoney()
  const { cart, update, remove } = useCart()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')

  const waNumber = whatsappNumber || whatsappFallback
  const waHref = waNumber
    ? buildWhatsAppUrl(waNumber, buildCartInquiryMessage(cart.items))
    : null

  async function changeQty(productId: string, q: number) {
    setBusyId(productId)
    try { await update(productId, q) } finally { setBusyId(null) }
  }

  async function removeItem(productId: string) {
    setBusyId(productId)
    try { await remove(productId) } finally { setBusyId(null) }
  }

  const empty = cart.items.length === 0

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[998] bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[999] flex w-full max-w-[450px] flex-col bg-black transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line px-8 py-[18px]">
          <h2 className="h5 text-gold">Cart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="text-muted transition-colors duration-200 hover:text-gold"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <p className="h6 text-muted">Your cart is empty</p>
              <Link href="/products" onClick={onClose} className="btn btn--outline">
                Continue shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="py-6">
                <FreeShippingBar
                  subtotal={cart.subtotal}
                  currency={cart.currency}
                  threshold={freeShippingThreshold}
                />
              </div>

              <ul className="flex flex-col gap-6 pb-6">
                {cart.items.map((item) => {
                  const img = item.image ? getImageUrl(item.image) : null
                  const href = `/products/${item.subcategory_slug || 'all'}/${item.slug}`
                  const isBusy = busyId === item.product_id

                  return (
                    <li key={item.product_id} className="flex gap-6">
                      <Link
                        href={href}
                        onClick={onClose}
                        className="relative h-[120px] w-[120px] flex-shrink-0 overflow-hidden rounded-[var(--radius-thumb)] bg-surface"
                      >
                        {img && (
                          <Image src={img} alt={item.name} fill sizes="120px" className="object-cover" />
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <Link
                          href={href}
                          onClick={onClose}
                          className="h6 text-ink transition-colors hover:text-gold"
                        >
                          {item.name}
                        </Link>

                        {showPrices && (
                          <p className="h6 text-muted">{money(item.price, item.currency)}</p>
                        )}

                        <div className="mt-auto flex items-center gap-4">
                          <QuantitySelector
                            size="sm"
                            value={item.quantity}
                            disabled={isBusy}
                            onChange={(q) => changeQty(item.product_id, q)}
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(item.product_id)}
                            disabled={isBusy}
                            className="text-xs text-muted-2 underline underline-offset-4 transition-colors hover:text-gold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        {/* Footer */}
        {!empty && (
          <footer className="border-t border-line p-8">
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              className="text-xs uppercase tracking-[0.18em] text-muted underline underline-offset-4 transition-colors hover:text-gold"
            >
              {noteOpen ? 'Hide order note' : 'Add order note'}
            </button>

            {noteOpen && (
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="How can we help you?"
                className="mt-3 w-full border border-line bg-surface-2 p-3 text-sm text-ink outline-none placeholder:text-muted-2 focus:border-gold"
              />
            )}

            {showPrices && (
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-gold">{money(cart.subtotal, cart.currency)}</span>
              </div>
            )}

            <p className="mt-2 text-xs text-muted-2">
              Taxes and shipping calculated at checkout
            </p>

            <div className="mt-5 grid gap-3">
              <Link href="/cart" onClick={onClose} className="btn btn--outline w-full">
                View cart
              </Link>

              {useWhatsAppInquiry ? (
                waHref ? (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn w-full">
                    Inquire on WhatsApp
                  </a>
                ) : (
                  <p className="text-center text-xs text-sale">WhatsApp number not configured.</p>
                )
              ) : (
                <Link href="/checkout" onClick={onClose} className="btn w-full justify-between">
                  <span>Checkout</span>
                  {showPrices && <span>{money(cart.subtotal, cart.currency)}</span>}
                </Link>
              )}
            </div>
          </footer>
        )}
      </aside>
    </>
  )
}
