'use client'

import { MessageCircle } from 'lucide-react'
import { buildWhatsAppUrl, whatsappFallback } from '@/lib/config'

interface Props {
  whatsappNumber?: string
}

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
      className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-[#25D366] hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
    </a>
  )
}
