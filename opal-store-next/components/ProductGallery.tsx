'use client'

/**
 * Product gallery — the reference's layout:
 *
 *  Desktop: a STICKY vertical thumbnail rail on the left (56px squares, 1px
 *  active hairline) beside a stacked, scroll-snapping column of square media.
 *  Clicking a thumbnail scrolls that media into view rather than swapping a
 *  single <img>.
 *
 *  Mobile: the rail moves BELOW into a horizontal row and the media becomes a
 *  swipeable carousel, with a circular zoom button floating top-right.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ZoomIn, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Thumbnail {
  src: string
  label: string
}

interface Props {
  productName: string
  thumbnails: Thumbnail[]
}

export default function ProductGallery({ productName, thumbnails }: Props) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  // Track which media is in view so the rail's active state follows scrolling
  // (desktop) and swiping (mobile), not just clicks. Uses the scroller's own
  // scroll position rather than IntersectionObserver, whose callbacks never
  // fire while the document is hidden.
  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return

    const measure = () => {
      const slides = slideRefs.current.filter(Boolean) as HTMLDivElement[]
      if (slides.length === 0) return

      // Mobile lays the media out as a horizontal scroller, so the reference
      // point is the scroller's own centre. Desktop stacks them and the PAGE
      // scrolls, so the reference point is the centre of the VIEWPORT — using
      // the (very tall) stack's own midpoint would always select the middle
      // image regardless of scroll position.
      const horizontal = root.scrollWidth > root.clientWidth + 1
      const rootRect = root.getBoundingClientRect()
      const anchor = horizontal
        ? rootRect.left + root.clientWidth / 2
        : window.innerHeight / 2

      let best = 0
      let bestDist = Infinity
      slides.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const centre = horizontal ? r.left + r.width / 2 : r.top + r.height / 2
        const dist = Math.abs(centre - anchor)
        if (dist < bestDist) { bestDist = dist; best = i }
      })
      setActive(best)
    }

    measure()
    root.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      root.removeEventListener('scroll', measure)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [thumbnails.length])

  // Close the lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  function goTo(i: number) {
    setActive(i)
    slideRefs.current[i]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }

  if (thumbnails.length === 0) {
    return (
      <div className="aspect-square w-full bg-surface" aria-hidden />
    )
  }

  const rail = (
    <ul
      className={cn(
        // Mobile: horizontal row below the media. Desktop: vertical rail.
        'no-scrollbar flex gap-3 overflow-x-auto pb-1',
        'md:flex-col md:overflow-visible md:pb-0',
      )}
    >
      {thumbnails.map((t, i) => (
        <li key={t.src}>
          <button
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show ${t.label}`}
            aria-current={i === active ? 'true' : undefined}
            className={cn(
              'relative block h-14 w-14 flex-shrink-0 overflow-hidden border p-px transition-[border-color] duration-100',
              i === active ? 'border-gold' : 'border-transparent hover:border-line',
            )}
          >
            <Image src={t.src} alt="" aria-hidden width={56} height={56} className="h-full w-full object-cover" />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-20">
        {/* Sticky lives on the wrapper: the flex row is tall (the media column
            sets its height) so the wrapper has travel room. A sticky <ul> inside
            a wrapper only as tall as itself has none, and just scrolls away. */}
        <div
          className="order-2 md:order-1 md:sticky md:self-start"
          style={{ top: 'calc(var(--sticky-area-height) + 2rem)' }}
        >
          {rail}
        </div>

        <div
          ref={scrollerRef}
          className={cn(
            'order-1 min-w-0 flex-1',
            // Mobile: one-per-view horizontal carousel.
            'no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto',
            // Desktop: stacked column, vertical snap.
            'md:grid md:snap-y md:grid-cols-1 md:gap-6 md:overflow-x-visible',
          )}
        >
          {thumbnails.map((t, i) => (
            <div
              key={t.src}
              ref={(el) => { slideRefs.current[i] = el }}
              className="relative aspect-square w-full flex-shrink-0 basis-full snap-center bg-surface md:basis-auto"
            >
              <Image
                src={t.src}
                alt={i === 0 ? productName : `${productName} — ${t.label}`}
                fill
                sizes="(max-width: 767px) 100vw, 45vw"
                priority={i === 0}
                className="object-cover"
              />

              <button
                type="button"
                onClick={() => setLightbox(t.src)}
                aria-label="Zoom image"
                className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-gold bg-black/70 text-gold transition-colors hover:bg-gold hover:text-black md:opacity-0 md:group-hover:opacity-100"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} enlarged`}
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-gold text-gold"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative h-[80vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt={productName} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
