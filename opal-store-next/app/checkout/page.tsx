import type { Metadata } from 'next'
import CheckoutForm from './CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order with cash on delivery.',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return <CheckoutForm />
}
