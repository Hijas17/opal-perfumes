import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { authDisabled } from '@/lib/config'
import OrderDetail from './OrderDetail'

export const metadata: Metadata = {
  title: 'Order Details',
  robots: { index: false, follow: false },
}

interface PageProps { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: PageProps) {
  if (authDisabled) redirect('/')
  const { id } = await params
  return <OrderDetail orderId={id} />
}
