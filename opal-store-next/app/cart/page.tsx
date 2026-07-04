import type { Metadata } from 'next'
import { getSettings } from '@/lib/api'
import CartView from './CartView'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review the perfumes in your shopping bag.',
  robots: { index: false, follow: false },
}

export default async function CartPage() {
  const settings = await getSettings()
  return <CartView settings={settings} />
}
