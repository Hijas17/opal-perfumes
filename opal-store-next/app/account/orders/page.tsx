import type { Metadata } from 'next'
import OrdersList from './OrdersList'

export const metadata: Metadata = {
  title: 'Order History',
  robots: { index: false, follow: false },
}

export default function OrdersPage() {
  return <OrdersList />
}
