'use client'

/**
 * Predictive search — modelled on the reference's header search.
 *
 * It drops down as a full-width panel directly beneath the sticky header
 * (rather than a centred modal), over a 40% scrim: a magnifier, a borderless
 * tracked input and a close button, with a horizontal row of product cards
 * appearing as you type. Products only — no collection or article suggestions,
 * matching the reference.
 *
 * "View all results" and Enter both go to /products?q=…
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Search, X } from 'lucide-react'

import { getProducts } from '@/lib/api'
import { getImageUrl } from '@/lib/image'
import { showPrices } from '@/lib/config'
import type { Product } from '@/lib/types'
import { useMoney } from './CurrencyProvider'

const DEBOUNCE_MS = 300

interface SearchOverlayProps {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const money = useMoney()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const items = await getProducts({ search: q })
        setResults(items.slice(0, 5))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/products?q=${encodeURIComponent(query.trim())}`)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay-enter fixed inset-0 z-[60] bg-black/40" />

        <Dialog.Content
          className="search-overlay-enter fixed inset-x-0 z-[61] border-b border-line bg-black"
          style={{ top: 'var(--sticky-area-height)' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>Search products</Dialog.Title>
          </VisuallyHidden.Root>

          <form onSubmit={submit} className="container-page flex items-center gap-4 py-6">
            <Search className="h-4 w-4 flex-shrink-0 text-gold" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value) }}
              placeholder="Search"
              aria-label="Search products"
              className="min-w-0 flex-1 border-0 bg-transparent text-[1.11rem] uppercase tracking-[0.18em] text-gold outline-none placeholder:text-gold/40"
            />
            <Dialog.Close
              aria-label="Close search"
              className="flex-shrink-0 text-muted opacity-60 transition-opacity duration-200 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </form>

          {query.trim() && (
            <div className="container-page max-h-[60vh] overflow-y-auto pb-8">
              {loading && <p className="text-sm text-muted-2">Searching…</p>}

              {!loading && results.length === 0 && (
                <p className="text-sm text-muted-2">
                  No products match &ldquo;{query.trim()}&rdquo;.
                </p>
              )}

              {!loading && results.length > 0 && (
                <>
                  <p className="eyebrow mb-4">Products</p>
                  <ul className="no-scrollbar flex gap-6 overflow-x-auto pb-2">
                    {results.map((p) => {
                      const src = p.images?.primary ? getImageUrl(p.images.primary) : null
                      const href = `/products/${p.subcategory_slug || p.category?.slug || 'all'}/${p.slug}`
                      const price = showPrices ? money(p.price, p.currency) : null

                      return (
                        <li key={p.id || p.slug} className="w-[160px] flex-shrink-0">
                          <Link href={href} onClick={onClose} className="group block">
                            <div className="relative aspect-square overflow-hidden bg-surface">
                              {src && (
                                <Image src={src} alt={p.name} fill sizes="160px" className="object-cover" />
                              )}
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink transition-colors group-hover:text-gold">
                              {p.name}
                            </p>
                            {price && <p className="mt-1 text-xs text-gold">{price}</p>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-6">
                    <Link
                      href={`/products?q=${encodeURIComponent(query.trim())}`}
                      onClick={onClose}
                      className="text-xs uppercase tracking-[0.18em] text-gold underline underline-offset-4"
                    >
                      View all results
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
