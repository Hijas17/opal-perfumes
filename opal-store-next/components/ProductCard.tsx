'use client'

/**
 * Product grid tile — follows the reference card anatomy:
 *
 *  - square media, primary image cross-fading to a secondary on hover
 *  - the whole media block lifts 2px with a soft shadow on hover
 *  - an ALWAYS-VISIBLE quick-add button bottom-right whose "+" rotates 90°
 *    on hover; clicking it adds to cart and opens the drawer
 *  - centre-aligned info: vendor eyebrow, title, price — all 12px/400/0.18em
 *  - badges stacked vertically at the TOP-RIGHT of the media
 *
 * Client component because quick-add needs cart + drawer state.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Plus, Check } from 'lucide-react'

import { getImageUrl } from '@/lib/image'
import { cn } from '@/lib/utils'
import { showPrices } from '@/lib/config'
import type { Product } from '@/lib/types'
import { useCart } from './CartProvider'
import { useCartDrawer } from './CartDrawerProvider'
import { useMoney } from './CurrencyProvider'

const LABEL_CLASS: Record<string, string> = {
  'new':             'badge badge--new',
  'bestseller':      'badge badge--bestseller',
  'limited edition': 'badge badge--limited',
  'featured':        'badge badge--featured',
}

const LABEL_TEXT: Record<string, string> = {
  'new':             'New',
  'bestseller':      'Bestseller',
  'limited edition': 'Limited Edition',
  'featured':        'Featured',
}

interface ProductCardProps {
  product: Product
  /** Render the image as `priority` (above-the-fold cards). */
  priority?: boolean
  /** Eyebrow above the title — the brand, standing in for the reference's vendor. */
  vendor?: string
}

export default function ProductCard({ product, priority = false, vendor }: ProductCardProps) {
  const money = useMoney()
  const { add } = useCart()
  const { openCart } = useCartDrawer()
  const [added, setAdded] = useState(false)

  const imgs = product.images || {}
  const primarySrc = imgs.primary ? getImageUrl(imgs.primary) : null
  const hoverSrc = imgs.hover ? getImageUrl(imgs.hover) : null

  const labelKey = product.label?.toLowerCase()
  const labelClass = labelKey ? LABEL_CLASS[labelKey] : null
  const labelText = labelKey ? LABEL_TEXT[labelKey] : null

  const categorySlug = product.subcategory_slug || product.category?.slug || 'all'
  const detailPath = `/products/${categorySlug}/${product.slug}`
  const price = showPrices ? money(product.price, product.currency) : null

  async function quickAdd(e: React.MouseEvent) {
    // The card is a link — don't navigate when the quick-add is clicked.
    e.preventDefault()
    e.stopPropagation()
    try {
      await add(product, 1)
      setAdded(true)
      openCart()
      window.setTimeout(() => setAdded(false), 1500)
    } catch {
      /* CartProvider surfaces its own failures; the card stays quiet. */
    }
  }

  return (
    <Link href={detailPath} className="product-card group block" prefetch>
      <div className="product-card__media">
        {primarySrc ? (
          <>
            <Image
              src={primarySrc}
              alt={product.name}
              fill
              sizes="(max-width: 699px) 50vw, (max-width: 999px) 33vw, 25vw"
              priority={priority}
              className="product-img-primary object-cover"
            />
            {hoverSrc && (
              <Image
                src={hoverSrc}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 699px) 50vw, (max-width: 999px) 33vw, 25vw"
                className="product-img-hover object-cover"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <svg className="h-12 w-12 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {labelText && labelClass && (
          <div className="absolute inset-inline-auto right-[0.7rem] top-[0.7rem] z-[1] flex flex-col items-end gap-1">
            <span className={cn(labelClass)}>{labelText}</span>
          </div>
        )}

        <button
          type="button"
          onClick={quickAdd}
          aria-label={`Add ${product.name} to cart`}
          className="product-card__quick-add"
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        {vendor && <p className="eyebrow text-[0.6875rem]">{vendor}</p>}

        <h3 className="text-xs uppercase tracking-[0.18em] text-ink transition-colors group-hover:text-gold">
          {product.name}
        </h3>

        {price && <p className="text-sm text-gold">{price}</p>}
      </div>
    </Link>
  )
}
