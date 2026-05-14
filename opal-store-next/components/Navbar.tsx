'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { ChevronDown, Search, Menu, X, ShoppingBag, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'
import { useSearchOverlay } from './SearchProvider'
import { useAuth } from './AuthProvider'
import { useCart } from './CartProvider'

interface NavbarProps {
  categories: Category[]
}

export default function Navbar({ categories }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileProdOpen, setMobileProdOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const pathname = usePathname()
  const { open: openSearch } = useSearchOverlay()
  const { isLoggedIn, customer, logout } = useAuth()
  const { cart } = useCart()

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false)
    setMobileProdOpen(false)
  }, [pathname])

  const isProductsActive = pathname.startsWith('/products')
  const isAboutActive    = pathname === '/about'
  const isContactActive  = pathname === '/contact'

  const linkBase = 'text-sm font-medium transition-all duration-300 pb-0.5'
  const activeStyle = 'text-gold border-b-2 border-gold'
  const idleStyle = 'text-gray-700 hover:text-gold'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm" style={{ height: '70px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display text-2xl font-semibold text-gold tracking-wide flex-shrink-0">
          Opal Perfumes
        </Link>

        {/* Desktop Nav — Radix NavigationMenu */}
        <div className="hidden md:flex items-center gap-8">
          <NavigationMenu.Root>
            <NavigationMenu.List className="flex items-center gap-8 list-none m-0 p-0">
              {/* Products dropdown */}
              <NavigationMenu.Item className="relative">
                <NavigationMenu.Trigger
                  className={cn(
                    'group flex items-center gap-1 bg-transparent border-0 cursor-pointer',
                    linkBase,
                    isProductsActive ? activeStyle : idleStyle
                  )}
                >
                  Products
                  <ChevronDown
                    className="w-3.5 h-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </NavigationMenu.Trigger>

                <NavigationMenu.Content className="absolute top-full left-0 mt-2 w-52 bg-white shadow-lg rounded-lg border border-gray-100 py-1 z-50">
                  <NavigationMenu.Link asChild>
                    <Link
                      href="/products"
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:text-gold hover:bg-amber-50 transition-colors duration-200"
                    >
                      All Products
                    </Link>
                  </NavigationMenu.Link>
                  {categories.map((cat) => (
                    <NavigationMenu.Link key={cat.id || cat.slug} asChild>
                      <Link
                        href={`/products/${cat.slug}`}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:text-gold hover:bg-amber-50 transition-colors duration-200"
                      >
                        {cat.name}
                      </Link>
                    </NavigationMenu.Link>
                  ))}
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Link href="/about" className={cn(linkBase, isAboutActive ? activeStyle : idleStyle)}>
                    About Us
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Link href="/contact" className={cn(linkBase, isContactActive ? activeStyle : idleStyle)}>
                    Contact Us
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            </NavigationMenu.List>
          </NavigationMenu.Root>

          {/* Search */}
          <button type="button" onClick={openSearch}
            className="text-gray-700 hover:text-gold transition-colors duration-300" aria-label="Open search">
            <Search className="w-5 h-5" />
          </button>

          {/* Cart icon with badge */}
          <Link href="/cart" className="relative text-gray-700 hover:text-gold transition-colors duration-300" aria-label="View cart">
            <ShoppingBag className="w-5 h-5" />
            {cart.item_count > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[10px] font-semibold flex items-center justify-center">
                {cart.item_count}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative">
            {isLoggedIn ? (
              <>
                <button type="button" onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-1 text-gray-700 hover:text-gold transition-colors duration-300"
                  aria-label="Account menu" aria-expanded={userMenuOpen}>
                  <User className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white shadow-lg rounded-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-[#1a1a1a] truncate">{customer?.email}</p>
                      </div>
                      <Link href="/account" onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:text-gold hover:bg-amber-50">
                        My Account
                      </Link>
                      <Link href="/account/orders" onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:text-gold hover:bg-amber-50">
                        Order History
                      </Link>
                      <button type="button"
                        onClick={async () => { await logout(); setUserMenuOpen(false) }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:text-gold hover:bg-amber-50 border-t border-gray-100">
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gold transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: search + cart + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button type="button" onClick={openSearch} className="text-gray-700 hover:text-gold" aria-label="Open search">
            <Search className="w-5 h-5" />
          </button>
          <Link href="/cart" className="relative text-gray-700 hover:text-gold" aria-label="View cart">
            <ShoppingBag className="w-5 h-5" />
            {cart.item_count > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-white text-[10px] font-semibold flex items-center justify-center">
                {cart.item_count}
              </span>
            )}
          </Link>
          <button type="button" onClick={() => setMobileOpen((o) => !o)}
            className="text-gray-700 hover:text-gold" aria-label="Toggle mobile menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-md">
          <div className="px-4 py-4 flex flex-col gap-1">
            {/* Products accordion */}
            <button
              type="button"
              onClick={() => setMobileProdOpen((o) => !o)}
              className="flex items-center justify-between w-full text-left px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold transition-colors"
              aria-expanded={mobileProdOpen}
            >
              Products
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', mobileProdOpen && 'rotate-180')} />
            </button>
            {mobileProdOpen && (
              <div className="pl-4 flex flex-col gap-1 bg-amber-50 rounded-lg py-1">
                <Link href="/products" className="block px-2 py-2 text-sm text-gray-700 hover:text-gold transition-colors">
                  All Products
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id || cat.slug}
                    href={`/products/${cat.slug}`}
                    className="block px-2 py-2 text-sm text-gray-700 hover:text-gold transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <Link href="/about" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold transition-colors">
              Contact Us
            </Link>
            <div className="border-t border-gray-100 mt-2 pt-2">
              {isLoggedIn ? (
                <>
                  <Link href="/account" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold">
                    My Account
                  </Link>
                  <Link href="/account/orders" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold">
                    Order History
                  </Link>
                  <button type="button" onClick={() => logout()}
                    className="block w-full text-left px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold">
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold">
                    Sign In
                  </Link>
                  <Link href="/signup" className="block px-2 py-2.5 text-sm font-medium text-gray-700 hover:text-gold">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
