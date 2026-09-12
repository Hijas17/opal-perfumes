'use client'

/**
 * Featured Collection row — four products visible, scrolling one product at a
 * time.
 *
 * Sitting directly above the Bestsellers grid, the two rows read as one
 * component, so any difference in alignment looks like a mistake rather than a
 * choice. The row therefore lives in the SAME container as that grid and sizes
 * each card to the same column width — four cards and three gaps fill the
 * container exactly, and the fifth is clipped by its edge rather than bleeding
 * into the margin. Change the grid's columns or gap and this has to follow.
 *
 * CSS scroll-snap rather than a carousel library: a swipe already steps one
 * card at a time, and the arrows are only a pointer-friendly way to do the
 * same thing. No requestAnimationFrame or IntersectionObserver anywhere —
 * both are suspended in a hidden document, which has already cost this
 * codebase twice.
 */

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Product } from '@/lib/types'
import ProductCard from './ProductCard'

/** Cards visible at once — must match the Bestsellers grid's column count. */
const VISIBLE = 4

interface Props {
  products: Product[]
  vendor?: string
  /** Passed straight to each card — see ProductCard's `suppressLabel`. */
  suppressLabel?: string
}

export default function FeaturedCarousel({ products, vendor, suppressLabel }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  const step = (dir: 1 | -1) => {
    const el = scroller.current
    if (!el) return

    // One card plus its gap, measured from the rendered cards rather than
    // assumed: the card width is a percentage of the container and the gap
    // changes with the breakpoint.
    const first = el.firstElementChild as HTMLElement | null
    const second = el.children[1] as HTMLElement | null
    const stride = first && second
      ? second.offsetLeft - first.offsetLeft
      : first?.offsetWidth ?? el.clientWidth / VISIBLE

    const max = el.scrollWidth - el.clientWidth
    const left = Math.min(Math.max(el.scrollLeft + dir * stride, 0), max)

    el.scrollTo({ left, behavior: 'smooth' })

    // A smooth scroll is an animation, and animations do not always run: in a
    // hidden or throttled document it never starts, leaving the arrow looking
    // broken. Measured, not assumed — a plain scrollLeft assignment moves the
    // row in environments where the smooth call lands nowhere at all. So check
    // shortly after and put it where it belongs if nothing happened.
    window.setTimeout(() => {
      if (Math.abs(el.scrollLeft - left) > 1) el.scrollLeft = left
    }, 400)
  }

  if (products.length === 0) return null

  return (
    <div className="relative">
      <div className="container-page">
        <div
          ref={scroller}
          className="no-scrollbar flex snap-x snap-mandatory gap-x-12 overflow-x-auto pb-4"
        >
          {products.map((p, i) => (
            <div
              key={p.id || p.slug}
              // Same width the Bestsellers grid gives a column: the container's
              // content width less the gaps between the visible cards, split
              // four ways (two on the narrow layout, matching grid-cols-2).
              className="w-[calc((100%-3rem)/2)] flex-shrink-0 snap-start lg:w-[calc((100%-9rem)/4)]"
            >
              <ProductCard
                product={p}
                vendor={vendor}
                priority={i < VISIBLE}
                suppressLabel={suppressLabel}
              />
            </div>
          ))}
        </div>
      </div>

      {products.length > VISIBLE && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous products"
            className="absolute left-2 top-[35%] hidden h-9 w-9 place-items-center border border-line bg-black text-gold transition-colors hover:border-gold md:grid"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next products"
            className="absolute right-2 top-[35%] hidden h-9 w-9 place-items-center border border-line bg-black text-gold transition-colors hover:border-gold md:grid"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
