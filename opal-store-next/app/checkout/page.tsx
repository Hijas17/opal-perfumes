import type { Metadata } from 'next'
import { getSettings } from '@/lib/api'
import { useWhatsAppInquiry } from '@/lib/config'
import CheckoutForm from './CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Send your order to us on WhatsApp.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // Only fetch site settings (for WhatsApp number/brand) when we're in inquiry mode —
  // saves a roundtrip on real-checkout deployments. Falls back gracefully if the
  // settings call fails so the page still renders and the env fallback can kick in.
  let whatsappNumber = ''
  let brandName = 'Opal Perfumes'
  if (useWhatsAppInquiry) {
    try {
      const settings = await getSettings()
      whatsappNumber = settings?.whatsapp_number ?? ''
      brandName = settings?.brand_name || brandName
    } catch {
      // leave defaults; CheckoutForm falls back to NEXT_PUBLIC_WHATSAPP_FALLBACK
    }
  }
  return <CheckoutForm whatsappNumber={whatsappNumber} brandName={brandName} />
}
