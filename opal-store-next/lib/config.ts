/**
 * Storefront feature flags — read once at module load (safe because
 * NEXT_PUBLIC_* vars are inlined at build time, so changing them requires
 * `next build` + `pm2 restart`).
 *
 * Toggle these via the Hostinger server's `.env.production`:
 *
 *   NEXT_PUBLIC_SHOW_PRICES=false        # hide all price displays + Product schema offers
 *   NEXT_PUBLIC_USE_WHATSAPP_INQUIRY=true # replace Add-to-Cart with WhatsApp inquiry button
 *   NEXT_PUBLIC_WHATSAPP_FALLBACK=+971501234567  # used if site_settings.whatsapp_number is empty
 */

/** Default true — set NEXT_PUBLIC_SHOW_PRICES=false to hide prices everywhere. */
export const showPrices = process.env.NEXT_PUBLIC_SHOW_PRICES !== 'false'

/** Default false — set NEXT_PUBLIC_USE_WHATSAPP_INQUIRY=true to swap cart flow for WhatsApp. */
export const useWhatsAppInquiry = process.env.NEXT_PUBLIC_USE_WHATSAPP_INQUIRY === 'true'

/** Fallback number when site_settings.whatsapp_number is unset. Strip non-digits at consume time. */
export const whatsappFallback = process.env.NEXT_PUBLIC_WHATSAPP_FALLBACK ?? ''

/**
 * Build a wa.me link with a pre-filled message.
 * Number may include `+`, spaces, parens — they're stripped.
 */
export function buildWhatsAppUrl(rawNumber: string, message: string): string {
  const digits = rawNumber.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
