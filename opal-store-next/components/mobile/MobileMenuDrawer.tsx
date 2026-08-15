'use client'

import Link from 'next/link'
import { ChevronRight, X, UserCircle2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authDisabled } from '@/lib/config'
import type { Category } from '@/lib/types'
import { useAuth } from '../AuthProvider'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
}

export default function MobileMenuDrawer({ open, onClose, categories }: Props) {
  const { isLoggedIn, customer, logout } = useAuth()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-[380px] bg-surface shadow-xl',
          'transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-line">
          <h2 className="font-display text-2xl font-bold text-ink">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1 text-ink hover:text-gold transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav>
            <Link
              href="/products"
              className="flex items-center justify-between px-5 py-4 text-sm font-semibold tracking-widest uppercase text-ink border-b border-line"
            >
              All Products
              <ChevronRight className="w-5 h-5 text-ink" strokeWidth={1.5} />
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id || cat.slug}
                href={`/products/${cat.slug}`}
                className="flex items-center justify-between px-5 py-4 text-sm font-semibold tracking-widest uppercase text-ink border-b border-line"
              >
                {cat.name}
                <ChevronRight className="w-5 h-5 text-ink" strokeWidth={1.5} />
              </Link>
            ))}
          </nav>

          {!authDisabled && (
          <div className="border-b border-line">
            {isLoggedIn ? (
              <>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs text-muted">Signed in as</p>
                  <p className="text-sm font-medium text-ink truncate">{customer?.email}</p>
                </div>
                <Link
                  href="/account"
                  className="flex items-center gap-3 px-5 py-3 text-sm text-ink"
                >
                  <UserCircle2 className="w-6 h-6" strokeWidth={1.5} />
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); onClose() }}
                  className="block w-full text-left px-5 py-3 text-sm text-ink border-t border-line"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-ink"
                >
                  <UserCircle2 className="w-6 h-6" strokeWidth={1.5} />
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-ink border-t border-line"
                >
                  <UserPlus className="w-6 h-6" strokeWidth={1.5} />
                  Create an Account
                </Link>
              </>
            )}
          </div>
          )}

          {/* Language stub — wire later */}
          <div>
            <div className="px-5 py-3 bg-surface-2 text-xs font-semibold tracking-widest uppercase text-ink">
              Language
            </div>
            <div className="flex items-center gap-8 px-5 py-4 text-sm">
              <button type="button" className="font-semibold text-ink underline underline-offset-4">EN</button>
              <button type="button" className="text-ink">AR</button>
            </div>
          </div>

          {/* Country stub — wire later */}
          <div>
            <div className="px-5 py-3 bg-surface-2 text-xs font-semibold tracking-widest uppercase text-ink">
              Country
            </div>
            <div className="px-5 py-4 text-sm text-ink">United Arab Emirates</div>
          </div>
        </div>
      </aside>
    </>
  )
}
