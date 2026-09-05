/* ──────────────────────────────────────────────────────────────────────────
   Display currencies.

   Product prices are stored and returned by the API in AED. Anything else is a
   DISPLAY conversion only — the cart, the order payload and the WhatsApp
   inquiry all continue to use the stored AED amounts.

   The dirham is pegged to the US dollar at a fixed 3.6725 AED = 1 USD (UAE
   Central Bank), so this rate is stable and needs no live FX feed. If a
   non-pegged currency is ever added, this is the place that must start
   fetching rates.
   ────────────────────────────────────────────────────────────────────────── */

export const CURRENCIES = ['AED', 'USD'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

export const BASE_CURRENCY: CurrencyCode = 'AED'

/**
 * Units of the given currency per 1 AED.
 *
 * ── ADDING A NON-PEGGED CURRENCY (EUR, GBP, INR, …) ────────────────────────
 * Both entries below are fixed because the dirham is pegged to the dollar, so
 * this table can safely be a constant. Any other currency floats, and a
 * hardcoded rate would silently go stale and start misquoting prices.
 *
 * To add one, this table has to become async-backed:
 *   1. add the code to CURRENCIES and CURRENCY_LABEL above;
 *   2. fetch rates from an FX provider in a cached Server Component / route
 *      handler (a daily `revalidate` is plenty for display purposes);
 *   3. pass the fetched table down through CurrencyProvider instead of
 *      importing this constant, and keep AED/USD as the offline fallback for
 *      when the provider is unreachable.
 *
 * Note that convert() and formatMoney() need no changes — only the source of
 * this table does.
 * ───────────────────────────────────────────────────────────────────────────
 */
const RATE_PER_AED: Record<CurrencyCode, number> = {
  AED: 1,
  USD: 1 / 3.6725,   // fixed UAE Central Bank peg: 3.6725 AED = 1 USD
}

export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  AED: 'AED',
  USD: 'USD',
}

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v)
}

/**
 * Convert an amount into the target display currency.
 * `from` defaults to AED — the currency the API stores.
 */
export function convert(
  amount: number,
  to: CurrencyCode,
  from: CurrencyCode = BASE_CURRENCY,
): number {
  if (from === to) return amount
  const inAed = amount / RATE_PER_AED[from]
  return inAed * RATE_PER_AED[to]
}

/**
 * Format an amount already expressed in `currency`.
 * Matches the existing "AED 420.00" shape rather than Intl's "AED 420.00"/"$420.00"
 * split, so prices read consistently across both options.
 */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  return `${CURRENCY_LABEL[currency]} ${amount.toFixed(2)}`
}

/** Convert then format in one step. Returns null for unusable input. */
export function convertAndFormat(
  price: number | string | null | undefined,
  to: CurrencyCode,
  from: CurrencyCode = BASE_CURRENCY,
): string | null {
  const n = typeof price === 'string' ? parseFloat(price) : price
  if (n === null || n === undefined || Number.isNaN(n)) return null
  return formatMoney(convert(n, to, from), to)
}
