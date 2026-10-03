/**
 * Stands in for the quantity stepper and buy buttons on the product page when
 * the admin has marked a product out of stock. Worded as a return date rather
 * than a refusal, and it still gives the shopper something to do: ask to be
 * told when the scent is back.
 */

import Link from 'next/link'
import { Hourglass } from 'lucide-react'

interface Props {
  productName: string
  /** Prefilled "tell me when it's back" WhatsApp link; null without a number. */
  notifyHref: string | null
}

export default function ComingBackSoon({ productName, notifyHref }: Props) {
  return (
    <div className="coming-soon">
      <Hourglass className="coming-soon__icon h-6 w-6" strokeWidth={1.25} aria-hidden />

      <p className="shimmer-text text-sm uppercase tracking-[0.3em]">Coming back soon</p>

      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Our perfumers are blending a fresh batch of {productName}. It will be
        back on the shelf shortly.
      </p>

      {notifyHref ? (
        <a
          href={notifyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--outline mt-2 w-full"
        >
          Notify me when it&apos;s back
        </a>
      ) : (
        <Link
          href={`/contact?product=${encodeURIComponent(productName)}`}
          className="btn btn--outline mt-2 w-full"
        >
          Notify me when it&apos;s back
        </Link>
      )}
    </div>
  )
}
