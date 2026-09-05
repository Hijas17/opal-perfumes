'use client'

/**
 * Renders a stored price in the shopper's selected display currency.
 *
 * Client component so a currency switch re-renders every price on the page
 * without a reload — including prices originating from Server Components,
 * which pass the raw amount down rather than a formatted string.
 *
 * Honours the `showPrices` flag, so callers do not each need to check it.
 */

import { convertAndFormat, BASE_CURRENCY, isCurrency } from '@/lib/currency'
import { showPrices } from '@/lib/config'
import { useCurrency } from './CurrencyProvider'

interface Props {
  /** Amount as stored by the API. */
  amount: number | string | null | undefined
  /** Currency the amount is stored in. Defaults to AED. */
  from?: string
  className?: string
}

export default function Price({ amount, from, className }: Props) {
  const { currency } = useCurrency()
  if (!showPrices) return null

  const base = isCurrency(from) ? from : BASE_CURRENCY
  const text = convertAndFormat(amount, currency, base)
  if (!text) return null

  return <span className={className}>{text}</span>
}
