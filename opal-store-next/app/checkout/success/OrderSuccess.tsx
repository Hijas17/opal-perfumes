'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { fetchOrder } from '@/lib/customer-api'
import { formatPrice } from '@/lib/format'
import type { Order } from '@/lib/types'

export default function OrderSuccess({ orderId }: { orderId: string | null }) {
  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(!!orderId)

  useEffect(() => {
    if (!orderId) return
    fetchOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <div className="pt-[70px] min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#1a1a1a] mb-2">Thank you!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been placed. We&rsquo;ll contact you soon to confirm delivery.
          </p>

          {loading && (
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {order && (
            <div className="bg-cream rounded-[var(--radius-card)] p-5 text-left mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Order Number</span>
                <span className="font-mono font-medium">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Status</span>
                <span className="capitalize font-medium text-amber-700">{order.status}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Payment</span>
                <span className="font-medium">Cash on Delivery</span>
              </div>
              <div className="border-t border-gray-200 my-3" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-gold">{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {order && (
              <Link href={`/account/orders/${order.id}`}
                className="inline-block bg-gold text-white px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors">
                View Order
              </Link>
            )}
            <Link href="/products"
              className="inline-block border border-gold text-gold px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
