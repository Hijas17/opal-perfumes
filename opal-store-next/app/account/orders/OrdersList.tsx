'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import AccountGuard from '@/components/AccountGuard'
import { fetchOrders } from '@/lib/customer-api'
import type { Order } from '@/lib/types'
import { useMoney } from '@/components/CurrencyProvider'

const STATUS_BADGES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersList() {
  return (
    <AccountGuard>
      <Inner />
    </AccountGuard>
  )
}

function Inner() {
  const money = useMoney()
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pt-16 md:pt-0 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="text-xs text-muted mb-4">
          <Link href="/account" className="hover:text-gold">My Account</Link> <span>/</span> Order History
        </nav>
        <h1 className="font-display text-4xl font-semibold text-ink mb-8">Order History</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-5">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-surface rounded-[var(--radius-card)] p-12 text-center shadow-[var(--shadow-card)]">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-2" />
            <h2 className="font-display text-xl text-ink mb-2">No orders yet</h2>
            <p className="text-sm text-muted mb-6">Your past orders will appear here.</p>
            <Link href="/products" className="inline-block btn">
              Shop Perfumes
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`}
                  className="block bg-surface rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-ink">{order.order_number}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        {' · '}{order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${STATUS_BADGES[order.status] || 'bg-surface-2 text-muted'}`}>
                        {order.status}
                      </span>
                      <span className="text-base font-semibold text-gold">{money(order.total, order.currency)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
