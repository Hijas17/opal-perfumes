'use client'

/**
 * Full-bleed toolbar above the product grid, with hairline rules top and
 * bottom — as on the reference collection page:
 *
 *   grid-density switcher (left) · "N PRODUCTS" (centre) · SORT BY popover (right)
 *
 * On small screens the density switcher is replaced by a Filter button that
 * opens the facet drawer.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, Grid2x2, Grid3x3, Rows3, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Density = 2 | 3 | 4

const SORTS: { value: string; label: string }[] = [
  { value: '',           label: 'Featured' },
  { value: 'name_asc',   label: 'Alphabetically, A-Z' },
  { value: 'name_desc',  label: 'Alphabetically, Z-A' },
  { value: 'price_asc',  label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
  { value: 'newest',     label: 'Date, new to old' },
  { value: 'oldest',     label: 'Date, old to new' },
]

interface Props {
  count: number
  sort: string
  density: Density
  onDensityChange: (d: Density) => void
  onOpenFilters: () => void
}

export default function CollectionToolbar({
  count,
  sort,
  density,
  onDensityChange,
  onOpenFilters,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function applySort(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('sort', value)
    else params.delete('sort')
    params.delete('page')
    router.push(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
    setOpen(false)
  }

  const current = SORTS.find((s) => s.value === sort) ?? SORTS[0]
  const densities: { d: Density; Icon: typeof Grid2x2; label: string }[] = [
    { d: 2, Icon: Grid2x2, label: 'Switch to larger product images' },
    { d: 3, Icon: Grid3x3, label: 'Switch to medium product images' },
    { d: 4, Icon: Rows3,   label: 'Switch to smaller product images' },
  ]

  return (
    <div className="border-y border-line">
      <div className="container-page flex items-center justify-between py-3">
        {/* Left — density (desktop) / filters (mobile) */}
        <div className="flex w-40 items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {densities.map(({ d, Icon, label }) => (
              <button
                key={d}
                type="button"
                onClick={() => onDensityChange(d)}
                aria-label={label}
                aria-pressed={density === d}
                className={cn(
                  'transition-colors',
                  density === d ? 'text-gold' : 'text-muted-2 hover:text-gold',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenFilters}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold md:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </button>
        </div>

        {/* Centre — count */}
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          {count} {count === 1 ? 'Product' : 'Products'}
        </p>

        {/* Right — sort popover */}
        <div ref={popRef} className="relative flex w-40 justify-end">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold"
          >
            Sort by
            <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <ul
              role="listbox"
              className="absolute right-0 top-full z-30 mt-3 w-56 border border-line bg-black py-1"
            >
              {SORTS.map((s) => (
                <li key={s.value || 'default'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={s.value === sort}
                    onClick={() => applySort(s.value)}
                    className={cn(
                      'block w-full px-4 py-2.5 text-left text-xs uppercase tracking-[0.18em] transition-colors',
                      s.value === sort ? 'text-gold' : 'text-gold/60 hover:text-gold',
                    )}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export { SORTS }
