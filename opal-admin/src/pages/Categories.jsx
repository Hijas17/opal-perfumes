import React, { useState, useEffect } from 'react'
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from '../api/index.js'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { Label } from '../components/ui/label.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Separator } from '../components/ui/separator.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../components/ui/alert-dialog.jsx'
import { cn } from '../lib/utils.js'

const emptyForm = { name: '', slug: '', description: '', display_order: '' }

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [editId, setEditId]         = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving]         = useState(false)

  const fetchCategories = () => {
    setLoading(true)
    getAdminCategories()
      .then((res) => setCategories(res.data?.data || res.data || []))
      .catch(() => setError('Failed to load categories.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCategories() }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'name' && !slugManual) {
      setForm((prev) => ({ ...prev, name: value, slug: slugify(value) }))
    } else if (name === 'slug') {
      setSlugManual(true)
      setForm((prev) => ({ ...prev, slug: slugify(value) }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const startEdit = (cat) => {
    setEditId(cat.id)
    setForm({
      name:          cat.name          || '',
      slug:          cat.slug          || '',
      description:   cat.description   || '',
      display_order: cat.display_order != null ? String(cat.display_order) : '',
    })
    setSlugManual(true)
    setError('')
    setSuccess('')
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(emptyForm)
    setSlugManual(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.name.trim()) { setError('Category name is required.'); return }

    const payload = {
      name:          form.name.trim(),
      slug:          form.slug.trim() || slugify(form.name.trim()),
      description:   form.description.trim(),
      display_order: form.display_order !== '' ? parseInt(form.display_order, 10) : 0,
    }

    setSaving(true)
    try {
      if (editId) {
        await updateCategory(editId, payload)
        setSuccess('Category updated.')
      } else {
        await createCategory(payload)
        setSuccess('Category created.')
      }
      cancelEdit()
      fetchCategories()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    try {
      await deleteCategory(cat.id)
      setSuccess('Category deleted.')
      fetchCategories()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete category.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form panel */}
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              {editId ? 'Edit Category' : 'Add Category'}
            </h2>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Perfume"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="auto-generated"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  URL: /products/{form.slug || 'slug'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short description (optional)"
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  name="display_order"
                  value={form.display_order}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
                </Button>
                {editId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* List panel */}
      <div className="lg:col-span-2">
        <Card className="p-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">All Categories</h2>
            </div>
            <Separator />

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No categories yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat) => (
                      <TableRow
                        key={cat.id}
                        className={cn(editId === cat.id && 'bg-accent')}
                      >
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                        <TableCell className="text-muted-foreground">{cat.display_order ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
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
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{cat.name}"? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(cat)}
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
    </div>
  )
}
