'use client'

/**
 * "Complete with" — the small horizontal card carousel that sits inside the
 * reference's buy column (it has no separate related-products section).
 *
 * There is no recommendations endpoint, so callers pass same-category products
 * with the current one excluded.
 */

import Image from 'next/image'
import Link from 'next/link'

import type { Product } from '@/lib/types'
import { getImageUrl } from '@/lib/image'
import { showPrices } from '@/lib/config'
import { useCart } from './CartProvider'
import { useCartDrawer } from './CartDrawerProvider'
import { useMoney } from './CurrencyProvider'

interface Props {
  products: Product[]
  heading?: string
}

export default function ComplementaryProducts({ products, heading = 'Complete with' }: Props) {
  const money = useMoney()
  const { add } = useCart()
  const { openCart } = useCartDrawer()

  if (products.length === 0) return null

  return (
    <section className="mt-10" aria-label={heading}>
      <p className="h5 mb-4 text-gold">{heading}</p>

      <ul className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {products.map((p) => {
          const src = p.images?.primary ? getImageUrl(p.images.primary) : null
          const href = `/products/${p.subcategory_slug || p.category?.slug || 'all'}/${p.slug}`
          const price = showPrices ? money(p.price, p.currency) : null

          return (
            <li
              key={p.id || p.slug}
              className="flex w-[280px] flex-shrink-0 snap-start items-center gap-3 border border-line p-3"
            >
              <Link href={href} className="relative h-[6.25rem] w-[6.25rem] flex-shrink-0 overflow-hidden bg-surface">
                {src && <Image src={src} alt={p.name} fill sizes="100px" className="object-cover" />}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={href} className="truncate text-xs uppercase tracking-[0.18em] text-ink hover:text-gold">
                  {p.name}
                </Link>
                {price && <span className="text-xs text-gold">{price}</span>}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await add(p, 1)
                      openCart()
                    } catch { /* CartProvider reports its own failures */ }
                  }}
                  className="mt-1 self-start text-[0.6875rem] uppercase tracking-[0.18em] text-gold underline underline-offset-4"
                >
                  Add to cart
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
