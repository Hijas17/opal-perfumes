'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, whatsappFallback } from '@/lib/config'

interface Props {
  whatsappNumber?: string
}

/**
 * Global WhatsApp inquiry FAB. Renders on all breakpoints; mounted from the
 * root layout so it persists across route changes.
 */
export default function WhatsAppFloat({ whatsappNumber }: Props) {
  const number = whatsappNumber || whatsappFallback
  if (!number) return null

  const href = buildWhatsAppUrl(number, "Hi! I'd like to know more about your perfumes.")

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="wa-float group fixed bottom-5 right-5 md:bottom-8 md:right-8 z-30 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
    >
      {/* Soft pulsing halo — sits behind the button, hidden until hover to keep the UI calm at rest */}
      <span aria-hidden className="wa-float__halo" />
      {/* Icon wrapper so we can wiggle just the glyph on hover without moving the whole button */}
      <span className="wa-float__glyph relative">
        <MessageCircle className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.75} />
      </span>
    </a>
  )
}
