'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import AccountGuard from '@/components/AccountGuard'
import { fetchOrder } from '@/lib/customer-api'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import type { Order } from '@/lib/types'

const STATUS_BADGES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrderDetail({ orderId }: { orderId: string }) {
  return (
    <AccountGuard>
      <Inner orderId={orderId} />
    </AccountGuard>
  )
}

function Inner({ orderId }: { orderId: string }) {
  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetchOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load order.'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="pt-[70px] min-h-screen bg-cream">
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold text-[#1a1a1a] mb-3">Order Not Found</h1>
          <p className="text-sm text-gray-500 mb-6">{error || 'We couldn\'t find that order.'}</p>
          <Link href="/account/orders" className="inline-block border border-gold text-gold px-8 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-[70px] min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-xs text-gray-500 mb-4">
          <Link href="/account" className="hover:text-gold">My Account</Link> <span>/</span>{' '}
          <Link href="/account/orders" className="hover:text-gold">Orders</Link> <span>/</span> {order.order_number}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a1a1a]">Order {order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed {order.created_at ? new Date(order.created_at).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-700'}`}>
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items + status timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Items">
              <ul className="divide-y divide-gray-100">
                {order.items.map((item) => {
                  const img = item.image ? getImageUrl(item.image) : null
                  return (
                    <li key={item.product_id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="w-16 h-16 bg-cream rounded-[var(--radius-card)] overflow-hidden relative flex-shrink-0">
                        {img && <Image src={img} alt={item.name} fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1a1a1a] truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm whitespace-nowrap">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {order.status_history.length > 0 && (
              <Card title="Status Timeline">
                <ol className="space-y-4">
                  {order.status_history.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gold mt-1.5" />
                      <div>
                        <p className="font-medium text-[#1a1a1a] capitalize">{h.status}</p>
                        {h.note && <p className="text-gray-600">{h.note}</p>}
                        {h.at && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(h.at).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>

          {/* Summary + shipping */}
          <div className="space-y-6">
            <Card title="Summary">
              <dl className="space-y-2 text-sm">
                <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency) || '—'} />
                <Row label="Shipping" value={order.shipping_fee > 0 ? formatPrice(order.shipping_fee, order.currency) || '—' : 'Free'} />
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-semibold text-gold">{formatPrice(order.total, order.currency)}</dd>
                </div>
                <Row label="Payment" value={order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method} />
                <Row label="Status"  value={<span className="capitalize">{order.payment_status}</span>} />
              </dl>
            </Card>

            <Card title="Shipping To">
              <address className="not-italic text-sm text-gray-700 leading-relaxed">
                <p className="font-medium text-[#1a1a1a]">{order.shipping.name}</p>
                {order.shipping.phone && <p>{order.shipping.phone}</p>}
                {order.shipping.email && <p>{order.shipping.email}</p>}
                <p className="mt-1">{order.shipping.address}</p>
                <p>{[order.shipping.city, order.shipping.country].filter(Boolean).join(', ')}</p>
                {order.shipping.notes && <p className="mt-2 text-xs text-gray-500 italic">Note: {order.shipping.notes}</p>}
              </address>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-semibold text-[#1a1a1a] mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-[#1a1a1a] font-medium text-right">{value}</dd>
    </div>
  )
}
