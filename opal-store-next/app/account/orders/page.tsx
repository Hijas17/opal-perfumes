import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { authDisabled } from '@/lib/config'
import OrdersList from './OrdersList'

export const metadata: Metadata = {
  title: 'Order History',
  robots: { index: false, follow: false },
}

export default function OrdersPage() {
  if (authDisabled) redirect('/')
  return <OrdersList />
}
