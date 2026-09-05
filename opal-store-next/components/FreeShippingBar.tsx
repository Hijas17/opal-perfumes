'use client'

/**
 * Free-shipping progress bar — as on the reference cart drawer and cart page:
 * a thin rounded track with milestone ticks beneath it, the final one
 * highlighted once the threshold is met.
 *
 * Rendered only when prices are visible; with `showPrices` off there is no
 * subtotal to reason about, so the bar would be meaningless.
 */

import { showPrices } from '@/lib/config'
import { useMoney } from './CurrencyProvider'

interface Props {
  subtotal: number
  currency: string
  threshold: number
  /** Tick labels under the track. Defaults to quarters of the threshold. */
  milestones?: number[]
}

export default function FreeShippingBar({
  subtotal,
  currency,
  threshold,
  milestones,
}: Props) {
  const money = useMoney()
  if (!showPrices || !threshold || threshold <= 0) return null

  const pct = Math.min(100, (subtotal / threshold) * 100)
  const reached = subtotal >= threshold
  const remaining = Math.max(0, threshold - subtotal)

  const ticks =
    milestones ??
    [0.2, 0.4, 0.6, 0.8, 1].map((f) => Math.round(threshold * f))

  return (
    <div className="grid gap-[0.45rem]">
      <p className="text-[0.88rem] leading-tight text-ink">
        {reached ? (
          <>You are eligible for <span className="text-gold">free shipping</span> in the UAE.</>
        ) : (
          <>
            Spend <span className="text-gold">{money(remaining, currency)}</span> more for
            free shipping in the UAE.
          </>
        )}
      </p>

      <div
        className="relative h-[0.56rem] overflow-hidden rounded-full border border-line bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(subtotal, threshold)}
        aria-label="Progress toward free shipping"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-[250ms] ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-flow-col justify-between gap-[0.2rem] text-[0.56rem] text-muted-2">
        {ticks.map((t, i) => (
          <span key={t} className={i === ticks.length - 1 && reached ? 'text-gold' : undefined}>
            {money(t, currency)}
          </span>
        ))}
      </div>
    </div>
  )
}
