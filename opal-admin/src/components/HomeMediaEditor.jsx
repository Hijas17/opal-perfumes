import React from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import MediaField from './MediaField.jsx'
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

const EMPTY_SLIDE = {
  image: '', eyebrow: '', headline: '', subtext: '', cta_label: 'Explore', cta_href: '/products',
}
const EMPTY_TILE = { image: '', title: '', href: '/products' }
const EMPTY_SIDE = { image: '', label: '', href: '/products' }

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
  const slides  = asArray(settings.home_hero_slides)
  const tiles   = asArray(settings.home_delight_tiles)
  const compare = asObject(settings.home_compare, { before: { ...EMPTY_SIDE }, after: { ...EMPTY_SIDE } })

  // ── list helpers ───────────────────────────────────────────────────────
  const setList = (key, next) => onChange(key, next)

  const updateItem = (key, list, index, field, value) => {
    const next = list.map((item, i) => (i === index ? { ...item, [field]: value } : item))
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
    onChange('home_compare', {
      ...compare,
      [side]: { ...asObject(compare[side], { ...EMPTY_SIDE }), [field]: value },
    })
  }

  return (
    <div className="space-y-10">
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
                  <MediaField
                    label="Image"
                    value={slide.image || ''}
                    onChange={(v) => updateItem('home_hero_slides', slides, i, 'image', v)}
                  />
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

      {/* ── Scented Delights tiles ─────────────────────────────────────── */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-semibold">Scented Delights Tiles</h3>
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => addItem('home_delight_tiles', tiles, EMPTY_TILE)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add tile
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          The three-across block partway down the home page. Square images look best — around 1000×1000.
        </p>

        {tiles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No tiles yet. The home page falls back to your first three categories.
          </p>
        ) : (
          <div className="space-y-4">
            {tiles.map((tile, i) => (
              <RowShell
                key={i}
                title={`Tile ${i + 1}`}
                index={i}
                count={tiles.length}
                onMove={(from, to) => moveItem('home_delight_tiles', tiles, from, to)}
                onRemove={(idx) => removeItem('home_delight_tiles', tiles, idx)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <MediaField
                    label="Image"
                    value={tile.image || ''}
                    onChange={(v) => updateItem('home_delight_tiles', tiles, i, 'image', v)}
                  />
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-1.5 block">Title</Label>
                      <Input
                        value={tile.title || ''}
                        placeholder="Perfumes"
                        onChange={(e) => updateItem('home_delight_tiles', tiles, i, 'title', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Link</Label>
                      <Input
                        value={tile.href || ''}
                        placeholder="/products"
                        onChange={(e) => updateItem('home_delight_tiles', tiles, i, 'href', e.target.value)}
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
