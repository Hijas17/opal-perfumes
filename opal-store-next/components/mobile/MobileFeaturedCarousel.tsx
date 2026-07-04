'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import { showPrices } from '@/lib/config'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface Props {
  products: Product[]
}

export default function MobileFeaturedCarousel({ products }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activePage, setActivePage] = useState(0)

  // Two items per page in the mockup
  const pageCount = Math.ceil(products.length / 2)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth)
      setActivePage(page)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToPage(page: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: page * el.clientWidth, behavior: 'smooth' })
  }

  function scrollBy(direction: 1 | -1) {
    scrollToPage(Math.max(0, Math.min(pageCount - 1, activePage + direction)))
  }

  if (products.length === 0) return null

  return (
    <section className="relative bg-white">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: pageCount }).map((_, pageIdx) => {
          const pair = products.slice(pageIdx * 2, pageIdx * 2 + 2)
          return (
            <div
              key={pageIdx}
              className="flex-none w-full snap-start grid grid-cols-2 gap-3 px-4 py-6"
            >
              {pair.map((product) => (
                <FeaturedCard key={product.id || product.slug} product={product} />
              ))}
            </div>
          )
        })}
      </div>

      {pageCount > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous"
            disabled={activePage === 0}
            className="absolute left-2 top-[42%] -translate-y-1/2 w-9 h-9 rounded-full border border-gray-300 bg-white/90 flex items-center justify-center text-gray-500 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Next"
            disabled={activePage === pageCount - 1}
            className="absolute right-2 top-[42%] -translate-y-1/2 w-9 h-9 rounded-full border border-gray-300 bg-white/90 flex items-center justify-center text-gray-500 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <div className="flex justify-center gap-2 pb-6">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToPage(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'w-2.5 h-2.5 rounded-full border transition-colors',
                  i === activePage
                    ? 'bg-[#1a1a1a] border-[#1a1a1a]'
                    : 'bg-white border-gray-400',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function FeaturedCard({ product }: { product: Product }) {
  const primary = product.images?.primary ? getImageUrl(product.images.primary) : null
  const categorySlug = product.subcategory_slug || product.category?.slug || 'all'
  const detailPath = `/products/${categorySlug}/${product.slug}`
  const price = showPrices ? formatPrice(product.price, product.currency) : null

  return (
    <Link href={detailPath} className="block">
      <div className="relative aspect-square bg-[#f5f5f5] overflow-hidden">
        {primary && (
          <Image
            src={primary}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain"
          />
        )}
        {product.label && (
          <span className="absolute top-0 right-0 bg-[#2f4531] text-white text-xs font-medium px-3 py-1">
            {product.label}
          </span>
        )}
      </div>
      <div className="pt-3 text-center">
        {product.category?.name && (
          <p className="text-xs tracking-widest uppercase text-gray-500">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-2 font-display font-semibold text-[#1a1a1a] text-sm line-clamp-2">
          {product.name}
        </h3>
        {price && (
          <p className="mt-2 text-sm text-gold font-semibold">{price}</p>
        )}
      </div>
    </Link>
  )
}
