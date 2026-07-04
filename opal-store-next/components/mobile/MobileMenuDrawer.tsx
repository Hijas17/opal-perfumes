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
          'fixed top-0 left-0 bottom-0 z-50 w-[85%] max-w-[380px] bg-white shadow-xl',
          'transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <h2 className="font-display text-2xl font-bold text-[#1a1a1a]">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1 text-[#1a1a1a] hover:text-gold transition-colors"
          >
            <X className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav>
            <Link
              href="/products"
              className="flex items-center justify-between px-5 py-4 text-sm font-semibold tracking-widest uppercase text-[#1a1a1a] border-b border-gray-100"
            >
              All Products
              <ChevronRight className="w-5 h-5 text-[#1a1a1a]" strokeWidth={1.5} />
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id || cat.slug}
                href={`/products/${cat.slug}`}
                className="flex items-center justify-between px-5 py-4 text-sm font-semibold tracking-widest uppercase text-[#1a1a1a] border-b border-gray-100"
              >
                {cat.name}
                <ChevronRight className="w-5 h-5 text-[#1a1a1a]" strokeWidth={1.5} />
              </Link>
            ))}
          </nav>

          {!authDisabled && (
          <div className="border-b border-gray-100">
            {isLoggedIn ? (
              <>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{customer?.email}</p>
                </div>
                <Link
                  href="/account"
                  className="flex items-center gap-3 px-5 py-3 text-sm text-[#1a1a1a]"
                >
                  <UserCircle2 className="w-6 h-6" strokeWidth={1.5} />
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); onClose() }}
                  className="block w-full text-left px-5 py-3 text-sm text-[#1a1a1a] border-t border-gray-100"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-[#1a1a1a]"
                >
                  <UserCircle2 className="w-6 h-6" strokeWidth={1.5} />
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-3 px-5 py-4 text-sm text-[#1a1a1a] border-t border-gray-100"
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
            <div className="px-5 py-3 bg-gray-50 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">
              Language
            </div>
            <div className="flex items-center gap-8 px-5 py-4 text-sm">
              <button type="button" className="font-semibold text-[#1a1a1a] underline underline-offset-4">EN</button>
              <button type="button" className="text-[#1a1a1a]">AR</button>
            </div>
          </div>

          {/* Country stub — wire later */}
          <div>
            <div className="px-5 py-3 bg-gray-50 text-xs font-semibold tracking-widest uppercase text-[#1a1a1a]">
              Country
            </div>
            <div className="px-5 py-4 text-sm text-[#1a1a1a]">United Arab Emirates</div>
          </div>
        </div>
      </aside>
    </>
  )
}
