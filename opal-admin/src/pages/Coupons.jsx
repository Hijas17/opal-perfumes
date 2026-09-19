import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getAdminProducts, getAdminCategories,
} from '../api/index.js'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog.jsx'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog.jsx'

const BLANK = {
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  max_discount: '',
  min_order: '',
  max_redemptions: '',
  max_per_customer: '',
  starts_at: '',
  ends_at: '',
  applies_to: { scope: 'all', product_ids: [], subcategory_slugs: [] },
  status: 'active',
}

/** `null` and numbers both need to become '' for a controlled input. */
function toField(value) {
  return value === null || value === undefined ? '' : String(value)
}

function money(amount) {
  return `AED ${Number(amount || 0).toFixed(2)}`
}

function CouponModal({ coupon, open, onClose, onSaved, products, categories }) {
  const [form, setForm]     = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(coupon
      ? {
          ...BLANK,
          ...coupon,
          value:            toField(coupon.value),
          max_discount:     toField(coupon.max_discount),
          min_order:        toField(coupon.min_order),
          max_redemptions:  toField(coupon.max_redemptions),
          max_per_customer: toField(coupon.max_per_customer),
          starts_at:        toField(coupon.starts_at),
          ends_at:          toField(coupon.ends_at),
          applies_to: {
            scope:             coupon.applies_to?.scope             || 'all',
            product_ids:       coupon.applies_to?.product_ids       || [],
            subcategory_slugs: coupon.applies_to?.subcategory_slugs || [],
          },
        }
      : BLANK)
  }, [coupon, open])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setScope = (scope) => setForm((f) => ({ ...f, applies_to: { ...f.applies_to, scope } }))

  function toggleIn(key, id) {
    setForm((f) => {
      const list = f.applies_to[key] || []
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
      return { ...f, applies_to: { ...f.applies_to, [key]: next } }
    })
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      if (coupon) await updateCoupon(coupon.id, form)
      else        await createCoupon(form)
      onSaved()
      onClose()
    } catch (e) {
      // The API owns the rules; show exactly what it said rather than
      // second-guessing it here and letting the two drift apart.
      setError(e.response?.data?.message || 'Failed to save coupon.')
    } finally {
      setSaving(false)
    }
  }

  const isPercentage = form.type === 'percentage'
  const scope = form.applies_to.scope

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{coupon ? `Edit ${coupon.code}` : 'New coupon'}</DialogTitle>
        </DialogHeader>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Code</Label>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="OUD20"
                className="font-mono"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                What the customer types. Case does not matter to them.
              </p>
            </div>
            <div>
              <Label className="mb-1.5 block">Internal note</Label>
              <Input
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Ramadan campaign"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Discount</Label>
            <div className="flex flex-wrap gap-2">
              {[['percentage', 'Percentage off'], ['fixed', 'Fixed amount off']].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('type', v)}
                  className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                    form.type === v ? 'border-primary bg-primary/10 font-medium' : 'border-input hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">{isPercentage ? 'Percent off' : 'Amount off (AED)'}</Label>
                <Input
                  type="number" min="0" step={isPercentage ? '1' : '0.01'}
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder={isPercentage ? '20' : '50'}
                />
              </div>
              {isPercentage && (
                <div>
                  <Label className="mb-1.5 block">Maximum discount (optional)</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={form.max_discount}
                    onChange={(e) => set('max_discount', e.target.value)}
                    placeholder="100"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Caps what 20% can cost you on a very large basket.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Valid from</Label>
              <Input type="date" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Valid until</Label>
              <Input type="date" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">
            Leave either blank for no limit in that direction.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-1.5 block">Minimum order (AED)</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.min_order}
                onChange={(e) => set('min_order', e.target.value)}
                placeholder="200"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Max total uses</Label>
              <Input
                type="number" min="0" step="1"
                value={form.max_redemptions}
                onChange={(e) => set('max_redemptions', e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Max uses per customer</Label>
              <Input
                type="number" min="0" step="1"
                value={form.max_per_customer}
                onChange={(e) => set('max_per_customer', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Applies to</Label>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Everything in the cart'],
                ['subcategories', 'Selected collections'],
                ['products', 'Selected products'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setScope(v)}
                  className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                    scope === v ? 'border-primary bg-primary/10 font-medium' : 'border-input hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {scope === 'subcategories' && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded border border-input p-3">
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No collections yet.</p>
                )}
                {categories.map((cat) => (
                  <label key={cat.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(form.applies_to.subcategory_slugs || []).includes(cat.slug)}
                      onChange={() => toggleIn('subcategory_slugs', cat.slug)}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            )}

            {scope === 'products' && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded border border-input p-3">
                {products.length === 0 && (
                  <p className="text-sm text-muted-foreground">No products yet.</p>
                )}
                {products.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(form.applies_to.product_ids || []).includes(p.id)}
                      onChange={() => toggleIn('product_ids', p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}

            {scope !== 'all' && (
              <p className="mt-2 text-xs text-muted-foreground">
                The discount applies only to the matching items, and the code is
                refused when a cart contains none of them.
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={form.status === 'active'}
              onChange={(e) => set('status', e.target.checked ? 'active' : 'inactive')}
              className="mt-0.5"
            />
            <span className="text-sm">
              Active
              <span className="block text-xs text-muted-foreground">
                Switch off to stop the code working without deleting it or losing its history.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save coupon'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Coupons() {
  const [coupons, setCoupons]   = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCats]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [editing, setEditing]   = useState(null)   // coupon object, or null for "new"
  const [modalOpen, setModal]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await getCoupons()
      setCoupons(r.data.data || [])
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Only needed by the restriction pickers, so a failure here shouldn't stop
  // the page listing coupons.
  useEffect(() => {
    getAdminProducts().then((r) => setProducts(r.data.data || [])).catch(() => {})
    getAdminCategories().then((r) => setCats(r.data.data || [])).catch(() => {})
  }, [])

  async function remove(coupon) {
    try {
      await deleteCoupon(coupon.id)
      setConfirmDelete(null)
      load()
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete coupon.')
    }
  }

  function describe(c) {
    const base = c.type === 'percentage' ? `${c.value}% off` : `${money(c.value)} off`
    const cap = c.type === 'percentage' && c.max_discount ? `, max ${money(c.max_discount)}` : ''
    return base + cap
  }

  function limits(c) {
    const parts = []
    if (c.min_order) parts.push(`min ${money(c.min_order)}`)
    if (c.max_redemptions) parts.push(`${c.redemptions}/${c.max_redemptions} used`)
    else if (c.redemptions) parts.push(`${c.redemptions} used`)
    if (c.max_per_customer) parts.push(`${c.max_per_customer} per customer`)
    if (c.applies_to?.scope === 'products') parts.push('selected products')
    if (c.applies_to?.scope === 'subcategories') parts.push('selected collections')
    return parts.join(' · ') || '—'
  }

  function validity(c) {
    if (!c.starts_at && !c.ends_at) return 'No limit'
    if (c.starts_at && c.ends_at)   return `${c.starts_at} → ${c.ends_at}`
    if (c.ends_at)                  return `Until ${c.ends_at}`
    return `From ${c.starts_at}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Promo codes customers enter at checkout. A code printed on a banner
            does nothing until it exists here.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModal(true) }}>
          <Plus className="mr-1 h-4 w-4" /> New coupon
        </Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead className="text-right">Given away</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}

              {!loading && coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No coupons yet.
                  </TableCell>
                </TableRow>
              )}

              {!loading && coupons.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => { setEditing(c); setModal(true) }}
                >
                  <TableCell>
                    <span className="font-mono font-medium">{c.code}</span>
                    {c.status !== 'active' && (
                      <Badge className="ml-2 bg-slate-200 text-slate-700">inactive</Badge>
                    )}
                    {c.description && (
                      <span className="block text-xs text-muted-foreground">{c.description}</span>
                    )}
                  </TableCell>
                  <TableCell>{describe(c)}</TableCell>
                  <TableCell className="text-sm">{validity(c)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{limits(c)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {c.total_discount ? money(c.total_discount) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="sm" className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(c) }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CouponModal
        coupon={editing}
        open={modalOpen}
        onClose={() => setModal(false)}
        onSaved={load}
        products={products}
        categories={categories}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              The code stops working immediately. Orders that already used it
              keep their own record of the discount, so nothing about past
              orders changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
