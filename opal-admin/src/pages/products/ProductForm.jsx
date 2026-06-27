import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminProduct,
  createProduct,
  updateProduct,
  getAdminCategories,
  getImageUrl,
} from '../../api/index.js'
import RichTextEditor from '../../components/RichTextEditor.jsx'
import { Button } from '../../components/ui/button.jsx'
import { Input } from '../../components/ui/input.jsx'
import { Textarea } from '../../components/ui/textarea.jsx'
import { Label } from '../../components/ui/label.jsx'
import { Card, CardContent } from '../../components/ui/card.jsx'
import { Alert, AlertDescription } from '../../components/ui/alert.jsx'
import { Separator } from '../../components/ui/separator.jsx'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select.jsx'
import { Upload, X, Plus } from 'lucide-react'

const CURRENCIES = ['AED', 'USD', 'SAR', 'EUR', 'GBP']
const LABELS     = ['none', 'new', 'bestseller', 'limited edition', 'featured']

function ImageField({ label, currentPath, file, onChange, required = false }) {
  const inputRef  = React.useRef(null)
  const previewUrl = file
    ? URL.createObjectURL(file)
    : currentPath
    ? getImageUrl(currentPath)
    : null

  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {previewUrl && (
        <div className="relative inline-block mb-2">
          <img
            src={previewUrl}
            alt={label}
            className="w-28 h-28 object-cover rounded border border-border"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          {file && (
            <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1 rounded">New</span>
          )}
        </div>
      )}
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-gold transition-colors duration-150"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          {currentPath || file ? 'Replace image' : 'Click to upload'}
        </p>
        <p className="text-xs text-muted-foreground/60">JPG, PNG, WEBP · max 5MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </div>
  )
}

function GalleryField({ currentGallery, newFiles, onAdd, onRemoveCurrent, onRemoveNew }) {
  const inputRef = React.useRef(null)

  return (
    <div className="space-y-1.5">
      <Label>Gallery Images <span className="text-muted-foreground font-normal text-xs">(up to 6)</span></Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {currentGallery.map((path, i) => (
          <div key={`cur-${i}`} className="relative group">
            <img
              src={getImageUrl(path)}
              alt={`Gallery ${i + 1}`}
              className="w-20 h-20 object-cover rounded border border-border"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <button
              type="button"
              onClick={() => onRemoveCurrent(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {newFiles.map((file, i) => (
          <div key={`new-${i}`} className="relative group">
            <img
              src={URL.createObjectURL(file)}
              alt={`New ${i + 1}`}
              className="w-20 h-20 object-cover rounded border border-green-300"
            />
            <span className="absolute top-0.5 left-0.5 bg-green-500 text-white text-[9px] px-1 rounded">New</span>
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      {(currentGallery.length + newFiles.length) < 6 && (
        <div
          className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-gold transition-colors duration-150"
          onClick={() => inputRef.current?.click()}
        >
          <p className="text-xs text-muted-foreground">Add gallery images</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => onAdd(Array.from(e.target.files))}
      />
    </div>
  )
}

function PurchaseLinkRow({ link, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Platform (e.g. Noon)"
        value={link.platform}
        onChange={(e) => onChange(index, 'platform', e.target.value)}
        className="flex-1"
      />
      <Input
        type="url"
        placeholder="URL (https://…)"
        value={link.url}
        onChange={(e) => onChange(index, 'url', e.target.value)}
        className="flex-[2]"
      />
      <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Separator />
        {children}
      </CardContent>
    </Card>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit   = !!id

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(isEdit)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const [form, setForm] = useState({
    name:              '',
    subcategory_id:    '',
    short_description: '',
    full_description:  '',
    scent_top:         '',
    scent_middle:      '',
    scent_base:        '',
    price:             '',
    currency:          'AED',
    size_volume:       '',
    label:             'none',
    is_featured:       false,
    display_order:     '',
    status:            'draft',
    seo_keywords:      '',
  })

  const [primaryFile,      setPrimaryFile]      = useState(null)
  const [hoverFile,        setHoverFile]         = useState(null)
  const [ingredientsFile,  setIngredientsFile]   = useState(null)
  const [currentImages,    setCurrentImages]     = useState({ primary: null, hover: null, ingredients: null, gallery: [] })
  const [galleryCurrentKept, setGalleryCurrentKept] = useState([])
  const [galleryNewFiles,  setGalleryNewFiles]   = useState([])
  const [purchaseLinks,    setPurchaseLinks]     = useState([])

  useEffect(() => {
    getAdminCategories()
      .then((res) => setCategories(res.data?.data || res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    getAdminProduct(id)
      .then((res) => {
        const p = res.data?.data || res.data
        if (!p) return
        setForm({
          name:              p.name              || '',
          subcategory_id:    p.subcategory_id    || '',
          short_description: p.short_description || '',
          full_description:  p.full_description  || '',
          scent_top:         p.scent_notes?.top    || '',
          scent_middle:      p.scent_notes?.middle || '',
          scent_base:        p.scent_notes?.base   || '',
          price:             p.price ? String(p.price) : '',
          currency:          p.currency    || 'AED',
          size_volume:       p.size_volume || '',
          label:             p.label       || 'none',
          is_featured:       p.is_featured || false,
          display_order:     p.display_order != null ? String(p.display_order) : '',
          status:            p.status      || 'draft',
          seo_keywords:      Array.isArray(p.seo_keywords) ? p.seo_keywords.join(', ') : (p.seo_keywords || ''),
        })
        setCurrentImages(p.images || { primary: null, hover: null, ingredients: null, gallery: [] })
        setGalleryCurrentKept(p.images?.gallery || [])
        setPurchaseLinks(p.purchase_links || [])
      })
      .catch(() => setError('Failed to load product data.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const addPurchaseLink    = () => setPurchaseLinks((prev) => [...prev, { platform: '', url: '' }])
  const removePurchaseLink = (i) => setPurchaseLinks((prev) => prev.filter((_, idx) => idx !== i))
  const changePurchaseLink = (i, field, value) =>
    setPurchaseLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) { setError('Product name is required.'); return }
    if (!isEdit && !primaryFile) { setError('Primary image is required for new products.'); return }

    const fd = new FormData()
    fd.append('name',              form.name.trim())
    if (form.subcategory_id) fd.append('subcategory_id', form.subcategory_id)
    fd.append('short_description', form.short_description)
    fd.append('full_description',  form.full_description)
    fd.append('scent_top',         form.scent_top)
    fd.append('scent_middle',      form.scent_middle)
    fd.append('scent_base',        form.scent_base)
    if (form.price) fd.append('price', form.price)
    fd.append('currency',     form.currency)
    fd.append('size_volume',  form.size_volume)
    fd.append('label',        form.label)
    fd.append('is_featured',  form.is_featured ? '1' : '0')
    if (form.display_order !== '') fd.append('display_order', form.display_order)
    fd.append('status', form.status)
    fd.append('seo_keywords', form.seo_keywords)
    fd.append('purchase_links', JSON.stringify(purchaseLinks.filter((l) => l.platform.trim() && l.url.trim())))

    if (primaryFile)     fd.append('primary_image',     primaryFile)
    if (hoverFile)       fd.append('hover_image',       hoverFile)
    if (ingredientsFile) fd.append('ingredients_image', ingredientsFile)
    galleryNewFiles.forEach((f) => fd.append('gallery[]', f))
    if (isEdit) fd.append('gallery_keep', JSON.stringify(galleryCurrentKept))

    setSaving(true)
    try {
      if (isEdit) {
        await updateProduct(id, fd)
        setSuccess('Product updated successfully.')
      } else {
        await createProduct(fd)
        navigate('/products')
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <SectionCard title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label>Product Name <span className="text-destructive">*</span></Label>
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Oud Al Majd"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.subcategory_id} onValueChange={(v) => setField('subcategory_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="— Select Category —" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status <span className="text-destructive">*</span></Label>
            <Select value={form.status} onValueChange={(v) => setField('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Short Description</Label>
          <Textarea
            name="short_description"
            value={form.short_description}
            onChange={handleChange}
            rows={2}
            placeholder="2–3 lines shown on product card and above the fold"
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Full Description</Label>
          <RichTextEditor
            value={form.full_description}
            onChange={(val) => setField('full_description', val)}
          />
        </div>
      </SectionCard>

      {/* Scent Notes */}
      <SectionCard title="Scent Notes">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'scent_top',    label: 'Top Notes',    placeholder: 'e.g. Bergamot, Lemon' },
            { name: 'scent_middle', label: 'Middle Notes', placeholder: 'e.g. Rose, Jasmine' },
            { name: 'scent_base',   label: 'Base Notes',   placeholder: 'e.g. Oud, Sandalwood' },
          ].map(({ name, label, placeholder }) => (
            <div key={name} className="space-y-1.5">
              <Label>{label}</Label>
              <Input name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Pricing & Details */}
      <SectionCard title="Pricing & Details">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Price</Label>
            <Input type="number" name="price" value={form.price} onChange={handleChange} placeholder="0.00" min="0" step="0.01" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setField('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Size / Volume</Label>
            <Input name="size_volume" value={form.size_volume} onChange={handleChange} placeholder="e.g. 50ml / 100ml" />
          </div>
          <div className="space-y-1.5">
            <Label>Display Order</Label>
            <Input type="number" name="display_order" value={form.display_order} onChange={handleChange} placeholder="0" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Label / Badge</Label>
            <Select value={form.label} onValueChange={(v) => setField('label', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === 'none' ? 'None' : l.charAt(0).toUpperCase() + l.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="is_featured"
              name="is_featured"
              checked={form.is_featured}
              onChange={handleChange}
              className="w-4 h-4 accent-gold"
            />
            <label htmlFor="is_featured" className="text-sm font-medium text-foreground cursor-pointer">
              Show on home page (Featured)
            </label>
          </div>
        </div>
      </SectionCard>

      {/* SEO */}
      <SectionCard title="SEO">
        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <Textarea
            name="seo_keywords"
            value={form.seo_keywords}
            onChange={handleChange}
            rows={2}
            placeholder="oud perfume dubai, arabian fragrance, gift for him"
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated keywords used in the page&apos;s <code>&lt;meta name=&quot;keywords&quot;&gt;</code> tag to help search engines understand this product.
          </p>
        </div>
      </SectionCard>

      {/* Purchase Links */}
      <SectionCard title="Purchase Links">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Add external shop links</p>
          <Button type="button" variant="outline" size="sm" onClick={addPurchaseLink}>
            <Plus className="w-4 h-4" /> Add Link
          </Button>
        </div>
        {purchaseLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase links added yet.</p>
        ) : (
          <div className="space-y-2">
            {purchaseLinks.map((link, i) => (
              <PurchaseLinkRow
                key={i}
                link={link}
                index={i}
                onChange={changePurchaseLink}
                onRemove={removePurchaseLink}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Images */}
      <SectionCard title="Images">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImageField label="Primary Image"     currentPath={currentImages.primary}     file={primaryFile}     onChange={setPrimaryFile}     required={!isEdit} />
          <ImageField label="Hover Image"       currentPath={currentImages.hover}       file={hoverFile}       onChange={setHoverFile} />
          <ImageField label="Ingredients Image" currentPath={currentImages.ingredients} file={ingredientsFile} onChange={setIngredientsFile} />
        </div>
        <GalleryField
          currentGallery={galleryCurrentKept}
          newFiles={galleryNewFiles}
          onAdd={(files) => setGalleryNewFiles((prev) => [...prev, ...files].slice(0, 6 - galleryCurrentKept.length))}
          onRemoveCurrent={(i) => setGalleryCurrentKept((prev) => prev.filter((_, idx) => idx !== i))}
          onRemoveNew={(i) => setGalleryNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </SectionCard>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving} className="px-8">
          {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate('/products')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
