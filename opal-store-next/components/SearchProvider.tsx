'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import SearchOverlay from './SearchOverlay'

interface SearchOverlayContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(null)

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = useContext(SearchOverlayContext)
  if (!ctx) throw new Error('useSearchOverlay must be used inside <SearchProvider>')
  return ctx
}

export default function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open  = useCallback(() => setIsOpen(true),  [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <SearchOverlayContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && <SearchOverlay onClose={close} />}
    </SearchOverlayContext.Provider>
  )
}
