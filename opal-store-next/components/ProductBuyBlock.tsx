'use client'

/**
 * Quantity stepper + the two CTAs, in the reference's order and geometry:
 * a 128×45 square stepper, then a full-width primary and a full-width
 * secondary stacked with a 16px gap.
 *
 * On the reference the secondary slot is Shopify's red "Buy it now". Ours is
 * the WhatsApp inquiry, which is the terminal action while
 * NEXT_PUBLIC_USE_WHATSAPP_INQUIRY is on.
 */

import { useState } from 'react'

import type { Product } from '@/lib/types'
import QuantitySelector from './QuantitySelector'
import AddToCartButton from './AddToCartButton'

interface Props {
  product: Product
  whatsappHref: string | null
}

export default function ProductBuyBlock({ product, whatsappHref }: Props) {
  const [qty, setQty] = useState(1)

  return (
    <div className="flex flex-col gap-4">
      <QuantitySelector value={qty} onChange={setQty} />

      <div className="grid gap-4">
        <AddToCartButton product={product} quantity={qty} />

        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline w-full"
          >
            Inquire via WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
