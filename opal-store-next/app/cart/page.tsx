import type { Metadata } from 'next'
import CartView from './CartView'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the perfumes in your shopping bag.',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return <CartView />
}
