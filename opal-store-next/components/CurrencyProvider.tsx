'use client'

/**
 * Display currency for prices.
 *
 * Only affects what the shopper SEES. Cart contents, order payloads and the
 * WhatsApp inquiry keep using the stored AED amounts, so switching currency can
 * never change what is actually charged.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react'
import {
  BASE_CURRENCY,
  convertAndFormat,
  isCurrency,
  type CurrencyCode,
} from '@/lib/currency'

// Where the removed header selector used to persist the shopper's choice.
const LEGACY_STORAGE_KEY = 'opal:currency:v1'

interface CurrencyState {
  currency: CurrencyCode
}

const Ctx = createContext<CurrencyState | null>(null)

export function useCurrency(): CurrencyState {
  // Forgiving default so any component rendered outside the provider (e.g. in
  // a test) still formats in the base currency rather than throwing.
  return useContext(Ctx) ?? { currency: BASE_CURRENCY }
}

/**
 * Drop-in replacement for `formatPrice` inside client components: same
 * (amount, storedCurrency) signature, but formats in the provider's display
 * currency — kept so a currency choice can return without touching callers.
 */
export function useMoney(): (
  amount: number | string | null | undefined,
  from?: string,
) => string | null {
  const { currency } = useCurrency()
  return useCallback(
    (amount, from) =>
      convertAndFormat(amount, currency, isCurrency(from) ? from : BASE_CURRENCY),
    [currency],
  )
}

export default function CurrencyProvider({ children }: { children: ReactNode }) {
  // Fixed to the base currency while the header has no currency selector. A
  // shopper who picked USD before the selector was removed would otherwise be
  // stuck on it with no way back, so their old preference is discarded.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      /* private mode / blocked storage — nothing stored to clear */
    }
  }, [])

  return (
    <Ctx.Provider value={{ currency: BASE_CURRENCY }}>{children}</Ctx.Provider>
  )
}
