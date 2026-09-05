'use client'

/**
 * Display-currency selection, persisted per browser.
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
  useState,
  type ReactNode,
} from 'react'
import {
  BASE_CURRENCY,
  convertAndFormat,
  isCurrency,
  type CurrencyCode,
} from '@/lib/currency'

const STORAGE_KEY = 'opal:currency:v1'

interface CurrencyState {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
}

const Ctx = createContext<CurrencyState | null>(null)

export function useCurrency(): CurrencyState {
  // Forgiving default so any component rendered outside the provider (e.g. in
  // a test) still formats in the base currency rather than throwing.
  return useContext(Ctx) ?? { currency: BASE_CURRENCY, setCurrency: () => {} }
}

/**
 * Drop-in replacement for `formatPrice` inside client components: same
 * (amount, storedCurrency) signature, but formats in the shopper's selected
 * display currency and re-renders when they change it.
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
  // Always start from the base currency so server and client markup match;
  // the stored preference is applied after mount.
  const [currency, setCurrencyState] = useState<CurrencyCode>(BASE_CURRENCY)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (isCurrency(saved)) setCurrencyState(saved)
    } catch {
      /* private mode / blocked storage — stay on the base currency */
    }
  }, [])

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    try {
      window.localStorage.setItem(STORAGE_KEY, c)
    } catch {
      /* non-fatal: the choice just won't survive a reload */
    }
  }, [])

  // Keep other tabs in sync, same as the cart does.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isCurrency(e.newValue)) setCurrencyState(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return <Ctx.Provider value={{ currency, setCurrency }}>{children}</Ctx.Provider>
}
