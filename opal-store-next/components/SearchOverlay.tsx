'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Search, X, Package } from 'lucide-react'
import { getProducts } from '@/lib/api'
import { getImageUrl } from '@/lib/image'
import type { Product } from '@/lib/types'

interface SearchOverlayProps {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
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
      return
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const items = await getProducts({ search: q })
        setResults(items.slice(0, 8))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    search(query)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, search])

  function handleResultClick(product: Product) {
    const category = product.subcategory_slug || product.category?.slug || 'all'
    router.push(`/products/${category}/${product.slug}`)
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/80 search-overlay-enter" />

        <Dialog.Content
          className="fixed inset-x-0 top-24 z-[201] flex justify-center px-4"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <VisuallyHidden.Root asChild>
            <Dialog.Title>Search Perfumes</Dialog.Title>
          </VisuallyHidden.Root>

          <div className="w-full max-w-2xl">
            {/* Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search perfumes…"
                className="w-full pl-12 pr-12 py-4 text-lg bg-white rounded-xl shadow-2xl outline-none text-[#1a1a1a] placeholder-gray-400"
              />
              <Dialog.Close
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            {/* Results */}
            {(results.length > 0 || loading || (query.trim() && !loading)) && (
              <div className="mt-2 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!loading && results.map((product) => {
                  const imgPath = product.images?.primary
                  const imgUrl = imgPath ? getImageUrl(imgPath) : null
                  const categoryName = product.subcategory_name || product.category?.name || ''

                  return (
                    <button
                      key={product.id || product.slug}
                      type="button"
                      onClick={() => handleResultClick(product)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-amber-50 transition-colors duration-200 border-b border-gray-100 last:border-0"
                    >
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex-shrink-0 flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-display text-sm font-medium text-[#1a1a1a]">{product.name}</p>
                        {categoryName && <p className="text-xs text-gray-500 mt-0.5">{categoryName}</p>}
                      </div>
                    </button>
                  )
                })}

                {!loading && results.length === 0 && query.trim() && (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No products found for &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
