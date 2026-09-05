'use client'

/**
 * Horizontal product carousel that bleeds off both edges of the viewport —
 * the reference's "Fragrance of the week" strip. CSS scroll-snap plus arrow
 * buttons; no carousel library, matching the reference's own approach.
 */

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { Product } from '@/lib/types'
import ProductCard from './ProductCard'

interface Props {
  products: Product[]
  vendor?: string
}

export default function FeaturedCarousel({ products, vendor }: Props) {
  const scroller = useRef<HTMLDivElement>(null)

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.6), behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="no-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto px-12 pb-4"
      >
        {products.map((p, i) => (
          <div key={p.id || p.slug} className="w-[260px] flex-shrink-0 snap-start">
            <ProductCard product={p} vendor={vendor} priority={i < 4} />
          </div>
        ))}
      </div>

      {products.length > 3 && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Previous products"
            className="absolute left-2 top-[35%] hidden h-9 w-9 place-items-center border border-line bg-black text-gold transition-colors hover:border-gold md:grid"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
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
