'use client'

/**
 * Slide-in navigation drawer for narrow screens.
 *
 * On desktop the primary nav sits in the header's second row; below `md` there
 * is no room for it, so it moves in here behind the hamburger. This replaces
 * the old mobile-only MobileMenuDrawer — the header is now one responsive
 * component rather than two parallel trees.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { authDisabled } from '@/lib/config'
import type { Category } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { useDeliveryLocation } from './LocationProvider'
import { CountryLabel, LocationButton } from './DeliverTo'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
}

const PAGES = [
  { label: 'Home',       href: '/' },
  { label: 'About Us',   href: '/about' },
  { label: 'Contact',    href: '/contact' },
]

export default function MenuDrawer({ open, onClose, categories }: Props) {
  const { isLoggedIn, customer, logout } = useAuth()
  const { openPicker } = useDeliveryLocation()

  // Lock scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const rowClass =
    'flex items-center justify-between border-b border-line px-6 py-4 text-xs uppercase tracking-[0.18em] text-gold/80 transition-colors hover:text-gold'

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[997] bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-[998] flex w-[85%] max-w-[380px] flex-col bg-black',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-[18px]">
          <h2 className="h5 text-gold">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-muted transition-colors duration-200 hover:text-gold"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* The header's delivery controls have no room below md, so they
              live here. The picker is a dialog of its own, so the drawer
              closes first rather than stacking two overlays. */}
          <div className="flex items-center gap-5 border-b border-line px-6 py-4">
            <CountryLabel />
            <LocationButton fullLabel onClick={() => { onClose(); openPicker() }} />
          </div>

          <nav aria-label="Collections">
            <Link href="/products" onClick={onClose} className={rowClass}>
              All Products
              <ChevronRight className="h-4 w-4" />
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id || cat.slug}
                href={`/products/${cat.slug}`}
                onClick={onClose}
                className={rowClass}
              >
                {cat.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </nav>

          <nav aria-label="Pages" className="mt-6">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} onClick={onClose} className={rowClass}>
                {p.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </nav>

          {!authDisabled && (
            <div className="mt-6">
              {isLoggedIn ? (
                <>
                  {customer?.email && (
                    <div className="px-6 pb-2 pt-4">
                      <p className="text-xs text-muted-2">Signed in as</p>
                      <p className="truncate text-sm text-ink">{customer.email}</p>
                    </div>
                  )}
                  <Link href="/account" onClick={onClose} className={rowClass}>
                    My Account
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/account/orders" onClick={onClose} className={rowClass}>
                    My Orders
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); onClose() }}
                    className={cn(rowClass, 'w-full text-left')}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={onClose} className={rowClass}>
                    Sign In
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/signup" onClick={onClose} className={rowClass}>
                    Create Account
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
