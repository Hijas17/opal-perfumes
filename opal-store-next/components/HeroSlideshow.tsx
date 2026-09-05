'use client'

/**
 * Full-bleed hero slideshow — the reference's opening section.
 *
 * There it is a 4s-autoplay carousel of background VIDEO slides with an
 * eyebrow, a display headline and an outline CTA over each. We have no video
 * assets, so slides are background stills; everything else matches.
 *
 * Autoplay pauses on hover/focus and is disabled entirely under
 * prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 4000

export interface HeroSlide {
  image: string
  eyebrow?: string
  headline: string
  subtext?: string
  ctaLabel?: string
  ctaHref?: string
}

interface Props {
  slides: HeroSlide[]
}

export default function HeroSlideshow({ slides }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const count = slides.length

  useEffect(() => {
    if (count <= 1 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [count, paused])

  if (count === 0) return null

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative h-[calc(100vh-var(--sticky-area-height))] min-h-[520px] w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
        touchStartX.current = null
      }}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.headline + i}
          aria-hidden={i !== index}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {/* Plain <img> — these are full-bleed decorative backgrounds and we
              want the very first frame painted without the optimiser in the way. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" aria-hidden />

          <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
            {slide.eyebrow && <p className="eyebrow text-gold">{slide.eyebrow}</p>}
            <h1 className="h1 max-w-3xl text-gold">{slide.headline}</h1>
            {slide.subtext && (
              <p className="max-w-xl text-sm leading-relaxed text-ink">{slide.subtext}</p>
            )}
            {slide.ctaHref && (
              <Link href={slide.ctaHref} className="btn btn--outline mt-2">
                {slide.ctaLabel || 'Explore'}
              </Link>
            )}
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-6 top-1/2 -translate-y-1/2 text-gold/70 transition-colors hover:text-gold"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gold/70 transition-colors hover:text-gold"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3">
            {slides.map((s, i) => (
              <button
                key={s.headline + i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-[2px] w-8 transition-colors',
                  i === index ? 'bg-gold' : 'bg-gold/30 hover:bg-gold/60',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
