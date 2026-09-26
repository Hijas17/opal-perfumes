/* ──────────────────────────────────────────────────────────────────────────
   Shipping fee, as configured under Settings → Shipping in the admin portal.

   Mirrors Settings::shippingFee() in the API. This copy only PREVIEWS the fee
   in the cart and at checkout; the API computes the amount actually charged,
   so if the two ever disagree the order and Stripe show the API's figure.
   ────────────────────────────────────────────────────────────────────────── */

import type { SiteSettings } from './types'

/** Used until the admin sets `shipping_fee`. */
export const DEFAULT_SHIPPING_FEE = 30

/** Used until the admin sets `free_shipping_threshold`. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 149

export interface ShippingRates {
  fee: number
  /** Subtotal at which shipping becomes free; null when there is no such level. */
  freeOver: number | null
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function shippingRates(settings: SiteSettings): ShippingRates {
  const fee = toNumber(settings.shipping_fee)
  const raw = settings.free_shipping_threshold
  const threshold = toNumber(raw)

  return {
    fee: fee !== null && fee >= 0 ? fee : DEFAULT_SHIPPING_FEE,
    // Unset → default; blank or zero → the admin turned free shipping off.
    freeOver:
      raw === undefined || raw === null
        ? DEFAULT_FREE_SHIPPING_THRESHOLD
        : threshold !== null && threshold > 0
          ? threshold
          : null,
  }
}

/** Fee for a cart with this subtotal (before any discount). */
export function shippingFeeFor(subtotal: number, rates: ShippingRates): number {
  if (rates.freeOver !== null && subtotal >= rates.freeOver) return 0
  return rates.fee
}
