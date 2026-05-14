import type { Metadata } from 'next'
import OrderDetail from './OrderDetail'

export const metadata: Metadata = {
  title: 'Order Details',
  robots: { index: false, follow: false },
}

interface PageProps { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  return <OrderDetail orderId={id} />
}
