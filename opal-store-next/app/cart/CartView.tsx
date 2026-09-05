'use client'

/**
 * Cart PAGE — deliberately different from the cart drawer, as on the reference:
 * a dark, centred table layout (PRODUCT | QUANTITY | TOTAL) with hairline rules,
 * the free-shipping bar under the title, and the order note beside the totals.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import { useCart } from '@/components/CartProvider'
import { getImageUrl } from '@/lib/image'
import {
  showPrices,
  useWhatsAppInquiry,
  buildWhatsAppUrl,
  buildCartInquiryMessage,
  whatsappFallback,
} from '@/lib/config'
import FreeShippingBar from '@/components/FreeShippingBar'
import QuantitySelector from '@/components/QuantitySelector'
import type { SiteSettings } from '@/lib/types'
import { useMoney } from '@/components/CurrencyProvider'

const DEFAULT_THRESHOLD = 250

interface Props {
  settings: SiteSettings
}

export default function CartView({ settings }: Props) {
  const money = useMoney()
  const { cart, loading, update, remove } = useCart()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const waNumber = settings.whatsapp_number || whatsappFallback
  const waHref = waNumber
    ? buildWhatsAppUrl(waNumber, buildCartInquiryMessage(cart.items))
    : null

  const threshold = Number(settings.free_shipping_threshold) || DEFAULT_THRESHOLD

  async function changeQty(productId: string, q: number) {
    setBusyId(productId)
    try { await update(productId, q) } finally { setBusyId(null) }
  }

  async function removeItem(productId: string) {
    setBusyId(productId)
    try { await remove(productId) } finally { setBusyId(null) }
  }

  if (!loading && cart.items.length === 0) {
    return (
      <div className="section-spacing pt-16 md:pt-0">
        <div className="container-page container-page--xs flex flex-col items-center gap-6 py-16 text-center">
          <h1 className="h2">Cart</h1>
          <p className="text-sm text-muted">Your cart is empty.</p>
          <Link href="/products" className="btn mt-2">Continue shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="section-spacing pt-16 md:pt-0">
      <div className="container-page" style={{ maxWidth: '980px' }}>
        <h1 className="h2 text-center">Cart</h1>

        <div className="mx-auto mt-8 max-w-md">
          <FreeShippingBar
            subtotal={cart.subtotal}
            currency={cart.currency}
            threshold={threshold}
          />
        </div>

        {/* Column headers — hidden on small screens where rows stack */}
        <div className="mt-12 hidden border-b border-line pb-3 md:grid md:grid-cols-[1fr_max-content_120px] md:gap-8">
          <span className="h6 text-muted">Product</span>
          <span className="h6 text-center text-muted">Quantity</span>
          <span className="h6 text-right text-muted">Total</span>
        </div>

        <ul>
          {cart.items.map((item) => {
            const img = item.image ? getImageUrl(item.image) : null
            const href = `/products/${item.subcategory_slug || 'all'}/${item.slug}`
            const isBusy = busyId === item.product_id

            return (
              <li
                key={item.product_id}
                className="grid grid-cols-1 gap-6 border-b border-line py-8 md:grid-cols-[1fr_max-content_120px] md:items-center md:gap-8"
              >
                {/* Product */}
                <div className="flex items-center gap-6">
                  <Link
                    href={href}
                    className="relative h-[100px] w-[100px] flex-shrink-0 overflow-hidden rounded-[var(--radius-thumb)] bg-surface"
                  >
                    {img && <Image src={img} alt={item.name} fill sizes="100px" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link href={href} className="h6 text-ink transition-colors hover:text-gold">
                      {item.name}
                    </Link>
                    {showPrices && (
                      <span className="text-sm text-muted">
                        {money(item.price, item.currency)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-4 md:justify-center">
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

                {/* Line total */}
                {showPrices ? (
                  <span className="text-sm text-gold md:text-right">
                    {money(item.price * item.quantity, item.currency)}
                  </span>
                ) : (
                  <span />
                )}
              </li>
            )
          })}
        </ul>

        {/* Note + totals */}
        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label htmlFor="order-note" className="h6 text-muted">Add order note</label>
            <textarea
              id="order-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How can we help you?"
              className="w-full border border-line bg-surface-2 p-3 text-sm text-ink outline-none placeholder:text-muted-2 focus:border-gold"
            />
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            {showPrices && (
              <div className="flex w-full justify-between md:max-w-xs">
                <span className="h6 text-muted">Total</span>
                <span className="h6 text-gold">{money(cart.subtotal, cart.currency)}</span>
              </div>
            )}
            <p className="text-xs text-muted-2 md:text-right">
              Taxes and shipping calculated at checkout
            </p>

            <div className="flex w-full flex-col gap-3 md:max-w-xs">
              {useWhatsAppInquiry ? (
                waHref ? (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn w-full">
                    Inquire on WhatsApp
                  </a>
                ) : (
                  <p className="text-xs text-sale">WhatsApp number not configured.</p>
                )
              ) : (
                <Link href="/checkout" className="btn w-full">Checkout</Link>
              )}
              <Link href="/products" className="btn btn--outline w-full">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
