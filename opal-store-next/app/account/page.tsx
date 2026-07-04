import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { authDisabled } from '@/lib/config'
import AccountDashboard from './AccountDashboard'

export const metadata: Metadata = {
  title: 'My Account',
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  if (authDisabled) redirect('/')
  return <AccountDashboard />
}
