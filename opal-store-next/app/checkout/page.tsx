import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/api'
import { checkoutEnabled, useWhatsAppInquiry } from '@/lib/config'
import { shippingRates } from '@/lib/shipping'
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

  // Settings supply the shipping rates for the order summary, plus the
  // WhatsApp number and brand when the inquiry option is offered alongside
  // checkout. getSettings() never throws — it returns {} — so the defaults
  // below and the env WhatsApp fallback take over if the API is unreachable.
  const settings = await getSettings()
  const whatsappNumber = useWhatsAppInquiry ? settings.whatsapp_number ?? '' : ''
  const brandName = (useWhatsAppInquiry && settings.brand_name) || 'Opal Perfumes'

  return (
    <CheckoutForm
      whatsappNumber={whatsappNumber}
      brandName={brandName}
      shippingRates={shippingRates(settings)}
    />
  )
}
