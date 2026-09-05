'use client'

/**
 * Rotating announcement bar — mirrors the reference storefront's:
 * 40px tall, NOT sticky (it scrolls away with the page), centred text that
 * cycles on a 2s autoplay, with chevron buttons either side.
 */

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const ROTATE_MS = 2000

interface Props {
  messages?: string[]
}

const DEFAULT_MESSAGES = [
  'Free delivery in UAE on orders over AED 250',
  'International shipping available',
]

export default function AnnouncementBar({ messages = DEFAULT_MESSAGES }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = messages.length

  useEffect(() => {
    if (count <= 1 || paused) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [count, paused])

  if (count === 0) return null

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  return (
    <aside
      className="relative z-[5] flex h-10 items-center justify-center border-b border-line bg-black px-4"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {count > 1 && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous announcement"
          className="absolute left-4 text-muted transition-colors hover:text-gold"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}

      <p
        key={index}
        aria-live="polite"
        className="search-overlay-enter text-center text-[11px] uppercase tracking-[0.18em] text-gold"
      >
        {messages[index]}
      </p>

      {count > 1 && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next announcement"
          className="absolute right-4 text-muted transition-colors hover:text-gold"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </aside>
  )
}
