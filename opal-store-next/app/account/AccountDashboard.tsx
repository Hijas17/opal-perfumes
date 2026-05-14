'use client'

import Link from 'next/link'
import { Package, User, LogOut, ShoppingBag } from 'lucide-react'
import AccountGuard from '@/components/AccountGuard'
import { useAuth } from '@/components/AuthProvider'

export default function AccountDashboard() {
  return (
    <AccountGuard>
      <DashboardInner />
    </AccountGuard>
  )
}

function DashboardInner() {
  const { customer, logout } = useAuth()

  return (
    <div className="pt-[70px] min-h-screen bg-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-4xl font-semibold text-[#1a1a1a] mb-2">
          Hello, {customer?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-500 mb-8">Manage your orders and account details.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card href="/account/orders" icon={<Package />} title="Order History" subtitle="View and track your orders" />
          <Card href="/products"        icon={<ShoppingBag />} title="Continue Shopping" subtitle="Browse our perfume collection" />
        </div>

        {/* Profile summary */}
        <div className="mt-8 bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl font-semibold text-[#1a1a1a]">Account Details</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <Row label="Name"  value={customer?.name  || '—'} />
            <Row label="Email" value={customer?.email || '—'} />
            <Row label="Phone" value={customer?.phone || '—'} />
            <Row label="Address" value={customer?.address || '—'} />
          </dl>
          <button type="button" onClick={() => logout()}
            className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group block bg-white rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-3 group-hover:bg-gold group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-[#1a1a1a]">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </Link>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <dt className="text-gray-500 w-24 flex-shrink-0">{label}</dt>
      <dd className="text-[#1a1a1a] font-medium text-right">{value}</dd>
    </div>
  )
}
