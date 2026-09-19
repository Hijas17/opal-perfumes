import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/api'
import { checkoutEnabled, useWhatsAppInquiry } from '@/lib/config'
import CheckoutForm from './CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  // Nothing to do here when checkout is off: a WhatsApp-only storefront starts
  // that conversation straight from the cart, with no delivery form in between.
  // `checkoutEnabled` is already false when auth is disabled, since an order
  // needs a customer to belong to.
  if (!checkoutEnabled) redirect('/cart')

  // The WhatsApp number and brand are only needed when the inquiry option is
  // offered alongside checkout. Falls back gracefully so the page still renders
  // and the env fallback can take over.
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
