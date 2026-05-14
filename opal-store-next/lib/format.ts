/** Format a price value with currency. Returns null when no usable number. */
export function formatPrice(price?: number | string | null, currency?: string | null): string | null {
  if (price === null || price === undefined || price === '') return null
  const num = typeof price === 'number' ? price : parseFloat(price)
  if (Number.isNaN(num)) return null
  const cur = currency || 'AED'
  return `${cur} ${num.toFixed(2)}`
}
