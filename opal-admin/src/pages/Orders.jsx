import React, { useState, useEffect, useCallback } from 'react'
import { getOrders, getOrder, updateOrderStatus } from '../api/index.js'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Input } from '../components/ui/input.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog.jsx'

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

// Fulfilment status → badge tone. Cancelled reads as destructive; delivered is
// the only "done" state, so it alone gets the positive treatment.
const STATUS_TONE = {
  pending:   'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const PAYMENT_TONE = {
  paid:     'bg-green-100 text-green-800',
  pending:  'bg-amber-100 text-amber-800',
  failed:   'bg-red-100 text-red-800',
  refunded: 'bg-slate-200 text-slate-700',
}

function money(amount, currency) {
  return `${currency || 'AED'} ${Number(amount || 0).toFixed(2)}`
}

function when(iso) {
  return iso ? new Date(iso).toLocaleString() : '—'
}

function OrderModal({ orderId, open, onClose, onUpdated }) {
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [status, setStatus]   = useState('')
  const [note, setNote]       = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [toast, setToast]     = useState('')

  useEffect(() => {
    if (!orderId) { setOrder(null); return }
    setLoading(true)
    setError('')
    setToast('')
    setNotifyCustomer(true)
    getOrder(orderId)
      .then((r) => {
        setOrder(r.data.data)
        setStatus(r.data.data.status)
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load order.'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function save() {
    setSaving(true)
    setError('')
    try {
      const r = await updateOrderStatus(orderId, {
        status,
        note: note.trim(),
        notify_customer: notifyCustomer,
      })
      setOrder(r.data.data)
      setNote('')
      setToast(r.data.message || 'Order status updated.')
      onUpdated?.()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? order.order_number : 'Order'}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}

        {order && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className={STATUS_TONE[order.status] || ''}>{order.status}</Badge>
              <Badge className={PAYMENT_TONE[order.payment_status] || ''}>
                {order.payment_method === 'card' ? 'Card' : 'Cash on delivery'} · {order.payment_status}
              </Badge>
              <span className="text-xs text-muted-foreground self-center">{when(order.created_at)}</span>
            </div>

            {/* Delivery details — what someone needs to actually ship the thing */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deliver to</p>
              <div className="text-sm bg-muted rounded p-3 space-y-0.5">
                <p className="font-medium">{order.shipping?.name}</p>
                <p>
                  <a href={`tel:${order.shipping?.phone}`} className="text-blue-600 hover:underline">
                    {order.shipping?.phone}
                  </a>
                  {order.shipping?.email && (
                    <>
                      {' · '}
                      <a href={`mailto:${order.shipping.email}`} className="text-blue-600 hover:underline">
                        {order.shipping.email}
                      </a>
                    </>
                  )}
                </p>
                <p>{order.shipping?.address}</p>
                <p>{[order.shipping?.city, order.shipping?.country].filter(Boolean).join(', ')}</p>
                {order.shipping?.notes && (
                  <p className="pt-1 text-muted-foreground">Notes: {order.shipping.notes}</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Items</p>
              <Table>
                <TableBody>
                  {(order.items || []).map((item, i) => (
                    <TableRow key={`${item.product_id}-${i}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right w-16">×{item.quantity}</TableCell>
                      <TableCell className="text-right w-32">
                        {money(item.price * item.quantity, item.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between text-sm pt-3 mt-1 border-t">
                <span>Subtotal</span><span>{money(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{order.shipping_fee > 0 ? money(order.shipping_fee, order.currency) : 'Free'}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1">
                <span>Total</span><span>{money(order.total, order.currency)}</span>
              </div>
            </div>

            {/* Stripe reference — the handle for issuing a refund in the Dashboard */}
            {order.payment?.payment_intent_id && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stripe payment</p>
                <p className="text-xs font-mono bg-muted rounded p-2 break-all">
                  {order.payment.payment_intent_id}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this in the Stripe Dashboard to refund or inspect the payment.
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">History</p>
              <ul className="text-sm space-y-1">
                {(order.status_history || []).map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span><span className="capitalize font-medium">{h.status}</span> — {h.note}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{when(h.at)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Update status</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 text-sm rounded border capitalize transition-colors ${
                      status === s ? 'border-primary bg-primary/10 font-medium' : 'border-input hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional) — e.g. tracking number. Included in the customer's email."
              />

              {order.shipping?.email ? (
                <label className="flex items-start gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Email the customer about this change
                    <span className="block text-xs text-muted-foreground">
                      Sends to {order.shipping.email}
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-xs text-muted-foreground mt-3">
                  This customer gave no email address, so they cannot be notified.
                  Their phone number is above.
                </p>
              )}

              {toast && <p className="text-sm text-green-700 mt-3">{toast}</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={save}
            disabled={!order || saving || (status === order?.status && !note.trim())}
          >
            {saving ? 'Saving…' : 'Save status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Orders() {
  const [orders, setOrders]   = useState([])
  const [meta, setMeta]       = useState({ page: 1, total_pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]   = useState('')
  // Debounced copy of `search` — the list refetches on this, not on every
  // keystroke.
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage]       = useState(1)
  const [openId, setOpenId]   = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await getOrders({
        page,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      })
      setOrders(r.data.data || [])
      setMeta(r.data.meta || { page: 1, total_pages: 1, total: 0 })
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm])

  useEffect(() => { load() }, [load])

  // Filtering from a later page would otherwise show an empty result set.
  function filterBy(status) {
    setStatusFilter(status)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">{meta.total} total</p>
        </div>
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search order number, name, phone…"
          className="max-w-xs"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => filterBy('')}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
            statusFilter === '' ? 'border-primary bg-primary/10 font-medium' : 'border-input hover:bg-muted'
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => filterBy(s)}
            className={`px-3 py-1.5 text-sm rounded border capitalize transition-colors ${
              statusFilter === s ? 'border-primary bg-primary/10 font-medium' : 'border-input hover:bg-muted'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Loading…</TableCell>
                </TableRow>
              )}

              {!loading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}

              {!loading && orders.map((o) => (
                <TableRow
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                  <TableCell>
                    <span className="font-medium">{o.shipping?.name || '—'}</span>
                    <span className="block text-xs text-muted-foreground">{o.shipping?.phone}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={PAYMENT_TONE[o.payment_status] || ''}>
                      {o.payment_method === 'card' ? 'Card' : 'COD'} · {o.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_TONE[o.status] || ''}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">{money(o.total, o.currency)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {when(o.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.total_pages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <OrderModal
        orderId={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
        onUpdated={load}
      />
    </div>
  )
}
