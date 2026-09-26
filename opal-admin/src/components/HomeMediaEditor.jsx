import React from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import MediaField from './MediaField.jsx'
import FocalPointPicker, { FRAMES } from './FocalPointPicker.jsx'
import { UPLOADS_URL } from '../api/index.js'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Label } from './ui/label.jsx'
import { Separator } from './ui/separator.jsx'

/**
 * Editors for the homepage's non-product imagery.
 *
 * Everything here is stored in site_settings as a single JSON value per key
 * (arrays / objects), so the whole block saves with the normal Settings save.
 * Nothing writes on its own except the image uploads, which land in the media
 * library immediately and are referenced here by filename.
 */

const MAX_SLIDES = 8
const MAX_BANNERS = 6

const EMPTY_SLIDE = {
  image: '', mobile_image: '', focal: { x: 50, y: 50 },
  eyebrow: '', headline: '', subtext: '', cta_label: 'Explore', cta_href: '/products',
}

/**
 * The slide's saved position, reading the older left/centre/right `focus`
 * for slides saved before the drag picker existed.
 */
function slideFocal(slide) {
  if (slide.focal && typeof slide.focal === 'object') return slide.focal
  return { x: { left: 0, right: 100 }[slide.focus] ?? 50, y: 50 }
}

const mediaUrl = (v) => (v && !v.startsWith('http') ? `${UPLOADS_URL}/${v}` : v)

// The three backdropped home sections. `defaultFocal` mirrors the side the
// storefront anchors each to until the admin drags it (app/page.tsx).
const BACKDROPS = [
  { key: 'home_featured_bg',    title: 'Featured Collection', defaultFocal: { x: 0,   y: 50 } },
  { key: 'home_bestsellers_bg', title: 'Bestsellers',         defaultFocal: { x: 100, y: 50 } },
  { key: 'home_collections_bg', title: 'Our Collections',     defaultFocal: { x: 100, y: 50 } },
]
const EMPTY_SIDE = { image: '', label: '', href: '/products' }
const EMPTY_BANNER = { image: '', headline: '', subtext: '', promo_code: '', href: '/products' }

/** Settings values arrive as JSON from Mongo but may be absent or malformed. */
function asArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  return fallback
}
function asObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  return fallback
}

function RowShell({ title, index, count, onMove, onRemove, children }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex items-center gap-1">
          <Button
            type="button" variant="ghost" size="sm"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button" variant="ghost" size="sm"
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button" variant="ghost" size="sm"
            onClick={() => onRemove(index)}
            title="Remove"
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function HomeMediaEditor({ settings, onChange }) {
  const slides   = asArray(settings.home_hero_slides)
  const banners  = asArray(settings.promo_banners)
  // Stored loosely, so treat anything but an explicit true as off.
  const bannersOn = settings.promo_banners_enabled === true
  const compare = asObject(settings.home_compare, { before: { ...EMPTY_SIDE }, after: { ...EMPTY_SIDE } })

  // ── list helpers ───────────────────────────────────────────────────────
  const setList = (key, next) => onChange(key, next)

  const updateItem = (key, list, index, field, value) => {
    const next = list.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      // A position chosen for one picture means nothing for another.
      if (field === 'image') delete updated.focal
      return updated
    })
    setList(key, next)
  }
  const addItem = (key, list, blank, max) => {
    if (max && list.length >= max) return
    setList(key, [...list, { ...blank }])
  }
  const removeItem = (key, list, index) => {
    setList(key, list.filter((_, i) => i !== index))
  }
  const moveItem = (key, list, from, to) => {
    if (to < 0 || to >= list.length) return
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setList(key, next)
  }

  const updateCompare = (side, field, value) => {
    const current = { ...asObject(compare[side], { ...EMPTY_SIDE }), [field]: value }
    if (field === 'image') delete current.focal
    onChange('home_compare', { ...compare, [side]: current })
  }

  return (
    <div className="space-y-10">
      {/* ── Promotional strip ───────────────────────────────────────────── */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold">Promotional Banners</h3>
          <Button
            type="button" variant="outline" size="sm"
            disabled={banners.length >= MAX_BANNERS}
            onClick={() => addItem('promo_banners', banners, EMPTY_BANNER, MAX_BANNERS)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add banner
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          A full-width banner directly under the navigation on the home page,
          for discounts and promotions. Banners rotate every 6 seconds and each
          one links to the product listing unless you point it somewhere
          narrower. Use <strong>16:9</strong> images — around 1920&times;1080.
          If the picture isn't 16:9, drag it into place under the upload.
        </p>

        {/* Master switch, so the strip disappears between promotions instead of
            forcing you to delete and re-enter the banners each time. */}
        <label className="mb-4 flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={bannersOn}
            onChange={(e) => onChange('promo_banners_enabled', e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            Show the promotional strip
            <span className="block text-xs text-muted-foreground">
              {bannersOn
                ? 'The strip is live on the home page.'
                : 'Hidden. Your banners are kept and reappear when you switch this back on.'}
            </span>
          </span>
        </label>

        {banners.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No banners yet. The strip stays hidden until you add one.
          </p>
        ) : (
          <div className="space-y-4">
            {banners.map((banner, i) => (
              <RowShell
                key={i}
                title={`Banner ${i + 1}`}
                index={i}
                count={banners.length}
                onMove={(from, to) => moveItem('promo_banners', banners, from, to)}
                onRemove={(idx) => removeItem('promo_banners', banners, idx)}
              >
                <div className="space-y-3">
                  <MediaField
                    label="Background image (16:9, optional)"
                    value={banner.image || ''}
                    onChange={(v) => updateItem('promo_banners', banners, i, 'image', v)}
                  />
                  {banner.image && (
                    <FocalPointPicker
                      src={mediaUrl(banner.image)}
                      value={banner.focal}
                      onChange={(v) => updateItem('promo_banners', banners, i, 'focal', v)}
                      frames={FRAMES.wide}
                    />
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Headline</Label>
                      <Input
                        value={banner.headline || ''}
                        onChange={(e) => updateItem('promo_banners', banners, i, 'headline', e.target.value)}
                        placeholder="20% off all Oud fragrances"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Supporting text</Label>
                      <Input
                        value={banner.subtext || ''}
                        onChange={(e) => updateItem('promo_banners', banners, i, 'subtext', e.target.value)}
                        placeholder="Until the end of the month"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Promo code (optional)</Label>
                      <Input
                        value={banner.promo_code || ''}
                        onChange={(e) => updateItem('promo_banners', banners, i, 'promo_code', e.target.value.toUpperCase())}
                        placeholder="OUD20"
                        className="font-mono"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Shown to the shopper only. Create the code itself under
                        Coupons — typing one here does not make it work.
                      </p>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Links to</Label>
                      <Input
                        value={banner.href || ''}
                        onChange={(e) => updateItem('promo_banners', banners, i, 'href', e.target.value)}
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </div>
              </RowShell>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* ── Hero slideshow ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold">Hero Slideshow</h3>
          <Button
            type="button" variant="outline" size="sm"
            disabled={slides.length >= MAX_SLIDES}
            onClick={() => addItem('home_hero_slides', slides, EMPTY_SLIDE, MAX_SLIDES)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add slide
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Full-width slides at the top of the home page. They rotate every 4 seconds;
          a single slide simply stays put. Landscape images work best — around 2400×1350.
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Phones and desktops crop the image differently — drag it in the two
          previews so the important part stays visible on both. For the best
          result on phones, also add a <strong>portrait image</strong> (around
          1080×1350); it replaces the landscape one on upright phones.
        </p>

        {slides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No slides yet. The home page falls back to its built-in hero until you add one.
          </p>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, i) => (
              <RowShell
                key={i}
                title={`Slide ${i + 1}`}
                index={i}
                count={slides.length}
                onMove={(from, to) => moveItem('home_hero_slides', slides, from, to)}
                onRemove={(idx) => removeItem('home_hero_slides', slides, idx)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <MediaField
                      label="Image (landscape)"
                      value={slide.image || ''}
                      onChange={(v) => updateItem('home_hero_slides', slides, i, 'image', v)}
                    />
                    <MediaField
                      label="Phone image (portrait, optional)"
                      value={slide.mobile_image || ''}
                      onChange={(v) => updateItem('home_hero_slides', slides, i, 'mobile_image', v)}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-1.5 block">Eyebrow</Label>
                      <Input
                        value={slide.eyebrow || ''}
                        placeholder="New arrivals"
                        onChange={(e) => updateItem('home_hero_slides', slides, i, 'eyebrow', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Headline</Label>
                      <Input
                        value={slide.headline || ''}
                        placeholder="The Oud Collection"
                        onChange={(e) => updateItem('home_hero_slides', slides, i, 'headline', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {slide.image && (
                  <div className="mt-4">
                    <Label className="mb-1.5 block">Position</Label>
                    <FocalPointPicker
                      frames={FRAMES.hero}
                      src={mediaUrl(slide.image)}
                      value={slideFocal(slide)}
                      onChange={(v) => updateItem('home_hero_slides', slides, i, 'focal', v)}
                    />
                    {slide.mobile_image && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Upright phones show the portrait image instead, so only
                        the Desktop preview matters while it is set.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <Label className="mb-1.5 block">Subtext</Label>
                  <Textarea
                    rows={2}
                    value={slide.subtext || ''}
                    placeholder="Resinous, deep and long-wearing — our most concentrated blends."
                    onChange={(e) => updateItem('home_hero_slides', slides, i, 'subtext', e.target.value)}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block">Button label</Label>
                    <Input
                      value={slide.cta_label || ''}
                      placeholder="Explore"
                      onChange={(e) => updateItem('home_hero_slides', slides, i, 'cta_label', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Button link</Label>
                    <Input
                      value={slide.cta_href || ''}
                      placeholder="/products"
                      onChange={(e) => updateItem('home_hero_slides', slides, i, 'cta_href', e.target.value)}
                    />
                  </div>
                </div>
              </RowShell>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* ── Product-section backdrops ──────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-base font-semibold">Section Backgrounds</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Photographs sitting behind three of the home page’s sections. They are
          heavily darkened so the titles stay readable, and product cards are
          transparent — so the image reads as texture behind and around everything
          on the section. Wide, dark images with the subject on one side and empty
          space on the other work best; around 1600&times;900. Drag the subject
          clear of the product cards. Leave empty to use the shipped defaults.
        </p>

        <div className="space-y-4">
          {BACKDROPS.map(({ key, title, defaultFocal }) => (
            <div key={key} className="rounded-lg border border-border p-4">
              <h4 className="mb-3 text-sm font-medium">{title}</h4>
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <MediaField
                  label="Background image"
                  value={settings[key] || ''}
                  onChange={(v) => {
                    onChange(key, v)
                    // New picture: back to the section's default anchoring.
                    onChange(`${key}_focal`, null)
                  }}
                />
                {settings[key] && (
                  <FocalPointPicker
                    src={mediaUrl(settings[key])}
                    value={settings[`${key}_focal`]}
                    onChange={(v) => onChange(`${key}_focal`, v)}
                    frames={FRAMES.backdrop}
                    defaultValue={defaultFocal}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Before / after comparator ──────────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-base font-semibold">Before / After Comparator</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          The split image with a draggable divider. Use two shots framed the same way —
          the divider wipes between them, so matching composition matters more than the subject.
          Leave either image empty to hide the whole section.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {['before', 'after'].map((side) => {
            const data = asObject(compare[side], { ...EMPTY_SIDE })
            return (
              <div key={side} className="rounded-lg border border-border p-4">
                <h4 className="mb-3 text-sm font-medium capitalize">
                  {side === 'before' ? 'Left half' : 'Right half'}
                </h4>
                <MediaField
                  label="Image"
                  value={data.image || ''}
                  onChange={(v) => updateCompare(side, 'image', v)}
                />
                {data.image && (
                  <div className="mt-3">
                    <FocalPointPicker
                      src={mediaUrl(data.image)}
                      value={data.focal}
                      onChange={(v) => updateCompare(side, 'focal', v)}
                      frames={FRAMES.wide}
                    />
                  </div>
                )}
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="mb-1.5 block">Label</Label>
                    <Input
                      value={data.label || ''}
                      placeholder={side === 'before' ? 'Poem For Him' : 'Poem For Her'}
                      onChange={(e) => updateCompare(side, 'label', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Button link</Label>
                    <Input
                      value={data.href || ''}
                      placeholder="/products"
                      onChange={(e) => updateCompare(side, 'href', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
