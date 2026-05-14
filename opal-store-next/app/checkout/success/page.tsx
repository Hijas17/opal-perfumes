import type { Metadata } from 'next'
import OrderSuccess from './OrderSuccess'

export const metadata: Metadata = {
  title: 'Order Placed',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ order?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { order } = await searchParams
  return <OrderSuccess orderId={order || null} />
}
