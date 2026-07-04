'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { Category, SiteSettings } from '@/lib/types'
import MobileNavbar from './MobileNavbar'
import MobileMenuDrawer from './MobileMenuDrawer'
import MobileCartDrawer from './MobileCartDrawer'

interface ShellState {
  openMenu: () => void
  openCart: () => void
  closeAll: () => void
}

const MobileShellContext = createContext<ShellState | null>(null)

export function useMobileShell(): ShellState {
  const ctx = useContext(MobileShellContext)
  if (!ctx) throw new Error('useMobileShell must be used inside <MobileShell>')
  return ctx
}

interface Props {
  categories: Category[]
  settings: SiteSettings
}

export default function MobileShell({ categories, settings }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const pathname = usePathname()

  const closeAll = () => {
    setMenuOpen(false)
    setCartOpen(false)
  }

  useEffect(() => {
    closeAll()
  }, [pathname])

  useEffect(() => {
    const anyOpen = menuOpen || cartOpen
    if (anyOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [menuOpen, cartOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value: ShellState = {
    openMenu: () => { setCartOpen(false); setMenuOpen(true) },
    openCart: () => { setMenuOpen(false); setCartOpen(true) },
    closeAll,
  }

  return (
    <MobileShellContext.Provider value={value}>
      <div className="md:hidden">
        <MobileNavbar />
        <MobileMenuDrawer
          open={menuOpen}
          onClose={closeAll}
          categories={categories}
        />
        <MobileCartDrawer
          open={cartOpen}
          onClose={closeAll}
          whatsappNumber={settings.whatsapp_number}
        />
      </div>
    </MobileShellContext.Provider>
  )
}
