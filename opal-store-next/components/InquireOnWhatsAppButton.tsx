import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, whatsappFallback } from '@/lib/config'

interface Props {
  /** Number from site_settings.whatsapp_number (server-fetched) — pass empty string if unknown. */
  whatsappNumber: string
  productName: string
  /** When true, render a smaller compact variant (used inside listings). */
  compact?: boolean
  /** Optional brand name to personalise the pre-filled message. */
  brandName?: string
}

/**
 * Server-friendly CTA that opens WhatsApp with a pre-filled inquiry about a
 * specific product. Used in place of the cart flow while we're not taking
 * orders directly.
 */
export default function InquireOnWhatsAppButton({
  whatsappNumber,
  productName,
  brandName = 'Opal Perfumes',
  compact = false,
}: Props) {
  const number = whatsappNumber || whatsappFallback
  if (!number) {
    // No number configured anywhere — silently render nothing so a missing
    // admin setting doesn't leave a broken-looking button on the page.
    return null
  }

  const message = `Hi ${brandName}, I'm interested in *${productName}*. Could you share more details and availability?`
  const href = buildWhatsAppUrl(number, message)

  const sizing = compact
    ? 'py-2.5 px-5 text-xs'
    : 'py-3.5 px-8 text-sm'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 w-full bg-[#25D366] text-white ${sizing} font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#1ebd5b] transition-colors`}
    >
      <MessageCircle className="w-4 h-4" />
      Inquire on WhatsApp
    </a>
  )
}
