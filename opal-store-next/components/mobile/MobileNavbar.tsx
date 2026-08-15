'use client'

import Link from 'next/link'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { authDisabled } from '@/lib/config'
import { useCart } from '../CartProvider'
import { useAuth } from '../AuthProvider'
import { useSearchOverlay } from '../SearchProvider'
import { useMobileShell } from './MobileShell'

export default function MobileNavbar() {
  const { cart } = useCart()
  const { isLoggedIn } = useAuth()
  const { open: openSearch } = useSearchOverlay()
  const { openMenu, openCart } = useMobileShell()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 bg-surface border-b border-line"
      style={{ height: '64px' }}
    >
      <div className="h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className="p-1 text-ink hover:text-gold transition-colors"
          >
            <Menu className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Open search"
            className="p-1 text-ink hover:text-gold transition-colors"
          >
            <Search className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <Link href="/" aria-label="Home" className="absolute left-1/2 -translate-x-1/2">
          <img
            src="/logo.png"
            alt="Opal Perfumes"
            className="h-11 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          {!authDisabled && (
            <Link
              href={isLoggedIn ? '/account' : '/login'}
              aria-label={isLoggedIn ? 'My account' : 'Sign in'}
              className="p-1 text-ink hover:text-gold transition-colors"
            >
              <User className="w-6 h-6" strokeWidth={1.75} />
            </Link>
          )}
          <button
            type="button"
            onClick={openCart}
            aria-label="Open cart"
            className="relative p-1 text-ink hover:text-gold transition-colors"
          >
            <ShoppingBag className="w-6 h-6" strokeWidth={1.75} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-[#1a1206] text-[10px] font-semibold flex items-center justify-center">
              {cart.item_count}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
}
