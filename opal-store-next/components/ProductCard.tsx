import Link from 'next/link'
import Image from 'next/image'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { showPrices } from '@/lib/config'
import type { Product } from '@/lib/types'

const LABEL_STYLES: Record<string, string> = {
  'new':              'bg-gold text-white',
  'bestseller':       'bg-gold text-[#1a1206]',
  'limited edition':  'bg-purple-700 text-white',
  'featured':         'bg-blue-600 text-white',
}

const LABEL_TEXT: Record<string, string> = {
  'new':              'New',
  'bestseller':       'Bestseller',
  'limited edition':  'Limited Edition',
  'featured':         'Featured',
}

interface ProductCardProps {
  product: Product
  /** When true, render image as `priority` (above-the-fold cards). */
  priority?: boolean
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const imgs = product.images || {}
  const primarySrc = imgs.primary ? getImageUrl(imgs.primary) : null
  const hoverSrc   = imgs.hover   ? getImageUrl(imgs.hover)   : null

  const labelKey   = product.label?.toLowerCase()
  const labelStyle = labelKey ? LABEL_STYLES[labelKey] : null
  const labelText  = labelKey ? LABEL_TEXT[labelKey]  : null

  const categorySlug = product.subcategory_slug || product.category?.slug || 'all'
  const detailPath   = `/products/${categorySlug}/${product.slug}`
  const price        = showPrices ? formatPrice(product.price, product.currency) : null

  return (
    <Link href={detailPath} className="block group" prefetch>
      {/* On mobile the tile is flat (no card bg/shadow/radius) — matches the reference
          storefront layout where products sit directly on the page background.
          From md up we get the card treatment: white bg, rounded, hover shadow. */}
      <div className="product-card relative overflow-hidden transition-shadow duration-300 cursor-pointer md:bg-surface md:rounded-[var(--radius-card)] md:shadow-[var(--shadow-card)] md:hover:shadow-[var(--shadow-card-hover)]">
        {/* Image Container */}
        <div className="aspect-square relative overflow-hidden bg-cream md:bg-cream">
          {primarySrc ? (
            <>
              <Image
                src={primarySrc}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                priority={priority}
                className="product-img-primary object-cover"
              />
              {hoverSrc && (
                <Image
                  src={hoverSrc}
                  alt={`${product.name} alternate view`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="product-img-hover object-cover"
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-cream">
              <svg className="w-16 h-16 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {labelText && (
            <span className={cn(
              // Right-aligned on mobile like the reference layout; keeps the desktop left-aligned card look.
              'absolute top-3 right-3 md:right-auto md:left-3 text-xs font-medium px-2 py-0.5 rounded-sm',
              labelStyle,
            )}>
              {labelText}
            </span>
          )}

          {/* Slide-up View Details — desktop card affordance only */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 overflow-hidden">
            <div className="product-card-btn bg-gold text-white text-center text-xs font-medium py-2.5 tracking-wider uppercase">
              View Details
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="py-3 text-center md:p-4 md:text-left">
          {product.category?.name && (
            <p className="text-[10px] md:text-xs tracking-widest uppercase text-muted md:hidden">
              {product.category.name}
            </p>
          )}
          <h3 className="mt-1 md:mt-0 font-display text-ink font-medium text-sm md:text-base leading-snug line-clamp-2">
            {product.name}
          </h3>
          {price && <p className="mt-1.5 text-sm text-gold font-semibold">{price}</p>}
          {product.short_description && (
            <p className="hidden md:block mt-1 text-xs text-muted line-clamp-2 leading-relaxed">
              {product.short_description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
