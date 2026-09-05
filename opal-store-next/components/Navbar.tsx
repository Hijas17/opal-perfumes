'use client'

/**
 * Desktop header — follows the reference storefront's structure:
 *
 *   row 1 : currency (left) · centred logo · search / account / cart (right)
 *   row 2 : centred primary nav
 *
 * There is no announcement bar above this — it was removed and its height
 * folded into row 1's padding, which is why that row is generously tall.
 *
 * Sticky at top with hide-on-scroll — scrolling down slides the header (and the
 * announcement bar above it) out of view; scrolling up brings it back. It
 * publishes its measured height to `--header-height` so sticky offsets on the
 * product and collection pages stay correct without hardcoded pixel values.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { ChevronDown, Search, ShoppingBag, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { authDisabled } from '@/lib/config'
import type { Category } from '@/lib/types'
import { useSearchOverlay } from './SearchProvider'
import { useAuth } from './AuthProvider'
import { useCart } from './CartProvider'
import { useCartDrawer } from './CartDrawerProvider'
import CurrencySelect from './CurrencySelect'

interface NavbarProps {
  categories: Category[]
}

const linkBase = 'text-xs uppercase tracking-[0.18em] transition-colors duration-200'
const idle = 'text-gold/70 hover:text-gold'
const active = 'text-gold'

export default function Navbar({ categories }: NavbarProps) {
  const pathname = usePathname()
  const { open: openSearch } = useSearchOverlay()
  const { isLoggedIn, logout } = useAuth()
  const { cart } = useCart()
  const { openCart } = useCartDrawer()

  const headerRef = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Publish the real header height so `--sticky-area-height` is accurate.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const publish = () => {
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Hide on scroll down, reveal on scroll up.
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      // Ignore tiny jitters and never hide near the very top of the page.
      if (Math.abs(y - lastY) < 6) return
      setHidden(y > lastY && y > 160)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setUserMenuOpen(false) }, [pathname])

  const isProducts = pathname.startsWith('/products')
  const isAbout = pathname === '/about'
  const isContact = pathname === '/contact'

  return (
    <header
      ref={headerRef}
      data-hidden={hidden}
      className="sticky top-0 z-[4] border-b border-line bg-black transition-transform duration-[250ms] ease-in-out data-[hidden=true]:-translate-y-full"
    >
      {/* ── Row 1 ─────────────────────────────────────────────────────── */}
      <div className="container-page--xl mx-auto flex items-center justify-between px-12 py-6">
        <div className="w-40">
          <CurrencySelect />
        </div>

        <Link href="/" aria-label="Opal Perfume — home" className="flex-shrink-0">
          {/* Plain <img> for instant first paint — the asset is small and the
              optimisation pipeline stalls on it in dev.
              HEIGHT-capped, unlike the footer and mobile bar: this is the
              stacked lockup (roughly 0.7:1), so capping width would make it
              absurdly tall. The horizontal /logo.png is still used everywhere
              else and stays width-capped. */}
          <img
            src="/logo-stacked.png"
            alt="Opal Perfume"
            className="h-[96px] w-auto lg:h-[112px]"
          />
        </Link>

        <div className="flex w-40 items-center justify-end gap-5">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="text-gold/70 transition-colors hover:text-gold"
          >
            <Search className="h-4 w-4" />
          </button>

          {!authDisabled && (
            <div className="relative">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={userMenuOpen}
                  className="block text-gold/70 transition-colors hover:text-gold"
                >
                  <User className="h-4 w-4" />
                </button>
              ) : (
                <Link href="/login" aria-label="Sign in" className="block text-gold/70 transition-colors hover:text-gold">
                  <User className="h-4 w-4" />
                </Link>
              )}

              {userMenuOpen && isLoggedIn && (
                <div className="absolute right-0 top-full mt-3 w-44 border border-line bg-black py-1">
                  <Link href="/account" className="block px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-gold/70 hover:text-gold">
                    Account
                  </Link>
                  <Link href="/account/orders" className="block px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-gold/70 hover:text-gold">
                    Orders
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full px-4 py-2.5 text-left text-xs uppercase tracking-[0.18em] text-gold/70 hover:text-gold"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={openCart}
            aria-label={`Cart, ${cart.item_count} items`}
            className="relative text-gold/70 transition-colors hover:text-gold"
          >
            <ShoppingBag className="h-4 w-4" />
            {cart.item_count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] text-black">
                {cart.item_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Row 2 — primary nav ───────────────────────────────────────── */}
      <nav className="border-t border-line-soft">
        {/* Root spans the full width so the mega-menu viewport below can be
            full-bleed; the list itself stays centred. */}
        <NavigationMenu.Root className="relative w-full">
          <NavigationMenu.List className="m-0 flex list-none items-center justify-center gap-8 p-0 py-3">
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/" className={cn(linkBase, pathname === '/' ? active : idle)}>Home</Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                className={cn('group flex cursor-pointer items-center gap-1 border-0 bg-transparent', linkBase, isProducts ? active : idle)}
              >
                Collections
                <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
              </NavigationMenu.Trigger>

              {/* Full-bleed mega menu — the reference renders this as an
                  edge-to-edge strip under the header (40px/48px padding) with
                  the collections in a single flex row, 40px apart. */}
              <NavigationMenu.Content className="w-full">
                <div className="container-page flex flex-wrap items-center gap-x-10 gap-y-4 py-10">
                  <NavigationMenu.Link asChild>
                    <Link
                      href="/products"
                      className="whitespace-nowrap text-xs uppercase tracking-[0.18em] text-gold transition-colors hover:text-ink"
                    >
                      All Products
                    </Link>
                  </NavigationMenu.Link>

                  {categories.map((cat) => (
                    <NavigationMenu.Link key={cat.id || cat.slug} asChild>
                      <Link
                        href={`/products/${cat.slug}`}
                        className="whitespace-nowrap text-xs uppercase tracking-[0.18em] text-gold/70 transition-colors hover:text-gold"
                      >
                        {cat.name}
                      </Link>
                    </NavigationMenu.Link>
                  ))}
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/about" className={cn(linkBase, isAbout ? active : idle)}>About Us</Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>

            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/contact" className={cn(linkBase, isContact ? active : idle)}>Contact</Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>

          {/* The panel renders here rather than inside the item, which is what
              lets it span the viewport instead of hanging off the trigger. */}
          <div className="absolute inset-x-0 top-full z-50">
            <NavigationMenu.Viewport className="w-full border-b border-line bg-black" />
          </div>
        </NavigationMenu.Root>
      </nav>
    </header>
  )
}
