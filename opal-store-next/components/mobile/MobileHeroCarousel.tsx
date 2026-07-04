'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface HeroSlide {
  image: string
  alt: string
  headline: string
  subtext: string
  ctaLabel: string
  ctaHref: string
}

interface Props {
  slides: HeroSlide[]
  /** Milliseconds between auto-advance slides. Set to 0 to disable. */
  autoPlayMs?: number
}

const DEFAULT_AUTOPLAY_MS = 4500

export default function MobileHeroCarousel({ slides, autoPlayMs = DEFAULT_AUTOPLAY_MS }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  // When the user touches the carousel we pause autoplay for a beat so it
  // doesn't fight their swipe. Interval resumes once they release.
  const [userInteracting, setUserInteracting] = useState(false)

  // Track which page is visible from scroll position
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth)
      setActive(page)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Pause autoplay while user is dragging the carousel
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const start = () => setUserInteracting(true)
    const end   = () => setUserInteracting(false)
    el.addEventListener('touchstart',  start, { passive: true })
    el.addEventListener('touchend',    end,   { passive: true })
    el.addEventListener('touchcancel', end,   { passive: true })
    el.addEventListener('mousedown',   start)
    el.addEventListener('mouseup',     end)
    el.addEventListener('mouseleave',  end)
    return () => {
      el.removeEventListener('touchstart',  start)
      el.removeEventListener('touchend',    end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown',   start)
      el.removeEventListener('mouseup',     end)
      el.removeEventListener('mouseleave',  end)
    }
  }, [])

  // Auto-advance loop
  useEffect(() => {
    if (autoPlayMs <= 0 || slides.length <= 1 || userInteracting) return
    const timer = setInterval(() => {
      const el = scrollerRef.current
      if (!el) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, autoPlayMs)
    return () => clearInterval(timer)
  }, [autoPlayMs, slides.length, userInteracting])

  if (slides.length === 0) return null

  return (
    <section className="relative">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="flex-none w-full snap-start">
            <div
              className="relative aspect-[3/4] w-full overflow-hidden bg-[#2b0f45] bg-cover bg-center"
              style={{ backgroundImage: `url("${slide.image}")` }}
              role="img"
              aria-label={slide.alt}
            >
              <div className="absolute inset-0 bg-gray-900/40" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-16 text-center">
                <h1 className="font-display italic text-3xl leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] max-w-xs">
                  {slide.headline}
                </h1>
                <p className="mt-4 text-sm text-white/90 leading-relaxed max-w-xs drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
                  {slide.subtext}
                </p>
                <Link
                  href={slide.ctaHref}
                  className="mt-6 inline-block bg-white text-[#1a1a1a] px-8 py-3.5 text-xs font-semibold tracking-[0.2em] uppercase shadow-lg hover:bg-white/90 transition-colors"
                >
                  {slide.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === active ? 'bg-white' : 'bg-white/40',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
