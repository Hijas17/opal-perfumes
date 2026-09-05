'use client'

/**
 * Client shell for the collection page: sticky facet sidebar, toolbar, grid
 * and numbered pagination — the reference's collection layout.
 *
 * The API returns every product in one response (there is no server-side
 * paging), so pagination here is client-side over the fetched list. The
 * numbered styling matches the reference: the current page is underlined
 * rather than filled.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

import type { Category, Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import ProductCard from './ProductCard'
import CollectionToolbar, { type Density } from './CollectionToolbar'

const PER_PAGE = 12

interface Props {
  products: Product[]
  categories: Category[]
  categorySlug?: string
  sort: string
  brandName: string
}

export default function CollectionView({
  products,
  categories,
  categorySlug,
  sort,
  brandName,
}: Props) {
  const [density, setDensity] = useState<Density>(4)
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const pageCount = Math.max(1, Math.ceil(products.length / PER_PAGE))
  const current = Math.min(page, pageCount)
  const visible = useMemo(
    () => products.slice((current - 1) * PER_PAGE, current * PER_PAGE),
    [products, current],
  )

  const gridCols =
    density === 2 ? 'md:grid-cols-2'
    : density === 3 ? 'md:grid-cols-2 lg:grid-cols-3'
    : 'md:grid-cols-3 lg:grid-cols-4'

  const facets = (
    <nav aria-label="Filter by category">
      <details className="accordion" open>
        <summary className="accordion__toggle">
          Category
          <svg className="accordion__icon h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="accordion__content flex flex-col gap-2.5">
          <Link
            href="/products"
            className={cn(
              'text-xs uppercase tracking-[0.18em] transition-colors',
              !categorySlug ? 'text-gold' : 'text-gold/60 hover:text-gold',
            )}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id || cat.slug}
              href={`/products/${cat.slug}`}
              className={cn(
                'text-xs uppercase tracking-[0.18em] transition-colors',
                cat.slug === categorySlug ? 'text-gold' : 'text-gold/60 hover:text-gold',
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  )

  return (
    <>
      <CollectionToolbar
        count={products.length}
        sort={sort}
        density={density}
        onDensityChange={setDensity}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <div className="container-page section-spacing">
        <div className="flex gap-12">
          {/* Sticky facet sidebar — desktop */}
          <aside
            className="hidden w-60 flex-shrink-0 md:block"
            style={{ position: 'sticky', top: 'calc(var(--sticky-area-height) + 2rem)', alignSelf: 'flex-start' }}
          >
            {facets}
          </aside>

          <div className="min-w-0 flex-1">
            {visible.length > 0 ? (
              <div className={cn('grid grid-cols-2 gap-x-12 gap-y-16', gridCols)}>
                {visible.map((product, i) => (
                  <ProductCard
                    key={product.id || product.slug}
                    product={product}
                    vendor={brandName}
                    priority={i < 4}
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center">
                <h3 className="h4 mb-3 text-muted">No products found</h3>
                <p className="mb-8 text-sm text-muted-2">
                  {categorySlug
                    ? 'There are no products in this category yet.'
                    : 'No products are available at the moment.'}
                </p>
                <Link href="/products" className="btn btn--outline">Browse all products</Link>
              </div>
            )}

            {/* Numbered pagination — current page underlined, not filled */}
            {pageCount > 1 && (
              <nav aria-label="Pagination" className="mt-16 flex justify-center gap-6">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setPage(n)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    aria-current={n === current ? 'page' : undefined}
                    className={cn(
                      'text-xs uppercase tracking-[0.18em] transition-colors',
                      n === current
                        ? 'text-gold underline underline-offset-8'
                        : 'text-gold/50 hover:text-gold',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Facet drawer — mobile */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} aria-hidden />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 w-[85%] max-w-[360px] overflow-y-auto bg-black px-6"
          >
            <div className="flex items-center justify-between border-b border-line py-[18px]">
              <h2 className="h5 text-gold">Filter</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="text-muted hover:text-gold">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {facets}
          </aside>
        </div>
      )}
    </>
  )
}
