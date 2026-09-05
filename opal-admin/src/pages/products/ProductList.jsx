import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminProducts, deleteProduct, getAdminCategories, getImageUrl, reorderProducts } from '../../api/index.js'
import { Button } from '../../components/ui/button.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Alert, AlertDescription } from '../../components/ui/alert.jsx'
import { Card, CardContent } from '../../components/ui/card.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select.jsx'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog.jsx'
import { Plus, GripVertical, Undo2 } from 'lucide-react'

export default function ProductList() {
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  // Drag-to-reorder state. `dirty` holds the pre-drag order so the list can be
  // reverted, and gates the Save/Cancel bar.
  const [dragIndex, setDragIndex]   = useState(null)
  const [overIndex, setOverIndex]   = useState(null)
  const [originalOrder, setOriginalOrder] = useState(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderMsg, setOrderMsg]     = useState('')
  const navigate = useNavigate()

  // Reordering only makes sense against the full, unfiltered list — a filtered
  // view hides neighbours, so dropping between two visible rows would write
  // positions that ignore everything in between.
  const canReorder = statusFilter === 'all' && categoryFilter === 'all'
  const orderDirty = originalOrder !== null

  const handleDragStart = (e, index) => {
    if (!canReorder) {
      e.preventDefault()
      return
    }
    // Firefox will not begin a drag unless dataTransfer carries something, so
    // this is required even though the payload itself is never read — the
    // index is tracked in state instead.
    try {
      e.dataTransfer.setData('text/plain', String(index))
      e.dataTransfer.effectAllowed = 'move'
    } catch {
      // Some browsers lock dataTransfer outside a real user gesture.
    }
    if (originalOrder === null) setOriginalOrder(products)
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    if (!canReorder || dragIndex === null) return
    // Required on every dragover, or the drop is rejected.
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (index === overIndex) return
    setOverIndex(index)
    setProducts((prev) => {
      if (dragIndex === index) return prev
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  const cancelReorder = () => {
    if (originalOrder) setProducts(originalOrder)
    setOriginalOrder(null)
    setOrderMsg('')
  }

  const saveOrder = async () => {
    setSavingOrder(true)
    setOrderMsg('')
    try {
      await reorderProducts(products.map((p) => p.id))
      setOriginalOrder(null)
      setOrderMsg('Order saved.')
      setTimeout(() => setOrderMsg(''), 2500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save the new order.')
      // Put the list back so what is on screen matches what is stored.
      if (originalOrder) setProducts(originalOrder)
      setOriginalOrder(null)
    } finally {
      setSavingOrder(false)
    }
  }

  const fetchProducts = () => {
    setLoading(true)
    const params = {}
    if (statusFilter !== 'all')  params.status   = statusFilter
    if (categoryFilter !== 'all') params.category = categoryFilter
    getAdminProducts(params)
      .then((res) => setProducts(res.data?.data || res.data || []))
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    getAdminCategories()
      .then((res) => setCategories(res.data?.data || res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // A filter change refetches, which would silently throw away an unsaved
    // drag — drop the pending state first so the two can't disagree.
    setOriginalOrder(null)
    fetchProducts()
  }, [statusFilter, categoryFilter])

  const handleDelete = async (id, name) => {
    try {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('Failed to delete product.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/products/bulk-upload')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk Upload
          </Button>
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {/* Unsaved-order bar. Dragging only rearranges local state; nothing is
          written until this is confirmed. */}
      {(orderDirty || orderMsg) && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm">
            {orderDirty
              ? 'Product order changed. Save to apply it to the storefront.'
              : orderMsg}
          </p>
          {orderDirty && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelReorder} disabled={savingOrder}>
                <Undo2 className="mr-1 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={saveOrder} disabled={savingOrder}>
                {savingOrder ? 'Saving…' : 'Save order'}
              </Button>
            </div>
          )}
        </div>
      )}

      {!canReorder && (
        <p className="mb-3 text-xs text-muted-foreground">
          Set both filters to “All” to drag products into a custom order.
        </p>
      )}

      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => (
                    <TableRow
                      key={product.id}
                      draggable={canReorder}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => { e.preventDefault(); handleDragEnd() }}
                      className={dragIndex === index ? 'opacity-50' : undefined}
                    >
                      <TableCell className="w-10">
                        <span
                          title={canReorder
                            ? 'Drag to reorder'
                            : 'Clear the filters to reorder products'}
                          className={canReorder
                            ? 'cursor-grab text-muted-foreground active:cursor-grabbing'
                            : 'cursor-not-allowed text-muted-foreground/30'}
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.images?.primary ? (
                          <img
                            src={getImageUrl(product.images.primary)}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded border border-border"
                            onError={(e) => { e.target.src = '' }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.category?.name || '—'}</TableCell>
                      <TableCell>
                        {product.price
                          ? `${product.currency || 'AED'} ${Number(product.price).toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {product.label ? (
                          <Badge variant="warning" className="capitalize">{product.label}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === 'published' ? 'success' : 'warning'}>
                          {product.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                          >
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete "{product.name}"? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(product.id, product.name)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
