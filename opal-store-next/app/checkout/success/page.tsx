import type { Metadata } from 'next'
import OrderSuccess from './OrderSuccess'

export const metadata: Metadata = {
  title: 'Order Placed',
  robots: { index: false, follow: false },
}

interface PageProps {
  // `order` is set by the cash-on-delivery flow; `session_id` is what Stripe
  // appends when it returns the customer from embedded Checkout.
  searchParams: Promise<{ order?: string; session_id?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { order, session_id } = await searchParams
  return <OrderSuccess orderId={order || null} sessionId={session_id || null} />
}
