'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { fetchOrder, fetchOrderBySession } from '@/lib/customer-api'
import { useCart } from '@/components/CartProvider'
import type { Order } from '@/lib/types'
import { useMoney } from '@/components/CurrencyProvider'

/** How long to keep asking the API whether the webhook has landed. */
const POLL_INTERVAL_MS = 1500
const POLL_ATTEMPTS    = 8

const PAYMENT_LABELS: Record<string, string> = {
  cod:  'Cash on Delivery',
  card: 'Card',
}

interface Props {
  /** Set by the cash-on-delivery flow. */
  orderId:   string | null
  /** Set by Stripe when it returns the customer from embedded Checkout. */
  sessionId: string | null
}

export default function OrderSuccess({ orderId, sessionId }: Props) {
  const money = useMoney()
  const { refresh: refreshCart } = useCart()
  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(!!(orderId || sessionId))
  // True while the payment succeeded on Stripe's side but our webhook hasn't
  // recorded it yet. Not an error — just a race we wait out.
  const [awaitingPayment, setAwaitingPayment] = useState(false)

  useEffect(() => {
    if (!orderId && !sessionId) return
    let cancelled = false

    async function load() {
      // Stripe returns us to `?session_id=…`, so that path resolves the order
      // by session; the cash-on-delivery path already has the id.
      const fetchIt = () =>
        sessionId ? fetchOrderBySession(sessionId) : fetchOrder(orderId as string)

      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (cancelled) return
        try {
          const result = await fetchIt()
          if (cancelled) return
          setOrder(result)
          setLoading(false)

          // A card order is only really done once the webhook has flipped it.
          // Until then keep polling rather than showing a confirmed order that
          // our own database still calls unpaid.
          const settled = result.payment_method !== 'card' || result.payment_status !== 'pending'
          if (settled) {
            setAwaitingPayment(false)
            // The webhook clears the server cart; pull that down so the header
            // count doesn't keep showing items the customer just bought.
            if (result.payment_status === 'paid') void refreshCart()
            return
          }
          setAwaitingPayment(true)
        } catch {
          // The order may not be readable yet on the very first try; keep
          // trying before giving up.
          if (attempt === POLL_ATTEMPTS - 1) {
            if (!cancelled) { setOrder(null); setLoading(false) }
            return
          }
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [orderId, sessionId, refreshCart])

  const paid = order?.payment_status === 'paid'
  const heading = awaitingPayment ? 'Confirming your payment…' : 'Thank you!'
  const blurb = awaitingPayment
    ? 'Your payment went through. We’re just recording it — this takes a moment.'
    : paid
      ? 'Your payment was received and your order is confirmed.'
      : 'Your order has been placed. We’ll contact you soon to confirm delivery.'

  return (
    <div className="pt-[var(--mobile-header-height)] md:pt-0 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-surface rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              awaitingPayment ? 'bg-amber-100' : 'bg-green-100'
            }`}
          >
            {awaitingPayment ? (
              <Clock className="w-8 h-8 text-amber-600" strokeWidth={2.5} />
            ) : (
              <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink mb-2">{heading}</h1>
          <p className="text-muted mb-6">{blurb}</p>

          {loading && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {order && (
            <div className="bg-cream rounded-[var(--radius-card)] p-5 text-left mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Order Number</span>
                <span className="font-mono font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Status</span>
                <span className="capitalize font-medium text-amber-700">{order.status}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Payment</span>
                <span className="font-medium">
                  {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                  {order.payment_method === 'card' && (
                    <span className={paid ? 'text-green-700' : 'text-amber-700'}>
                      {paid ? ' · Paid' : ' · Pending'}
                    </span>
                  )}
                </span>
              </div>
              <div className="border-t border-line my-3" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-gold">{money(order.total, order.currency)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {order && (
              <Link href={`/account/orders/${order.id}`}
                className="inline-block btn">
                View Order
              </Link>
            )}
            <Link href="/products"
              className="inline-block border border-gold text-gold px-8 py-3 text-sm font-medium tracking-wider uppercase hover:bg-gold hover:text-white transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
