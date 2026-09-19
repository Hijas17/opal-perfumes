'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export interface PromoBannerItem {
  image?: string
  headline?: string
  subtext?: string
  promoCode?: string
  href: string
}

const ROTATE_MS = 6000

/**
 * The promotional banner directly under the navbar on the home page.
 *
 * A full 16:9 block, so promotional artwork reads as artwork rather than as a
 * thin notification bar. Capped at 78vh: strict 16:9 on an ultrawide monitor
 * would be over a thousand pixels tall and push the hero entirely off screen.
 *
 * A banner with no image falls back to a compact text band — an empty 16:9
 * area with one line of text floating in it just looks broken.
 *
 * Rotates on its own, but pauses on hover and whenever the tab is hidden —
 * a banner advancing in a background tab is wasted, and one sliding out from
 * under a cursor is worse.
 *
 * Renders nothing at all when there are no banners, so the home page keeps its
 * exact previous layout until something is actually being promoted.
 */
export default function PromoBanner({ banners }: { banners: PromoBannerItem[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const count = banners.length

  const go = useCallback((next: number) => {
    setIndex(((next % count) + count) % count)
  }, [count])

  useEffect(() => {
    if (count <= 1 || paused) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(t)
  }, [count, paused])

  // Don't animate against a tab nobody is looking at.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (count === 0) return null

  const active = banners[index]
  // Every banner shares the tallest treatment any of them needs, so rotating
  // between an image banner and a text-only one doesn't make the page jump.
  const anyImage = banners.some((b) => b.image)

  return (
    <section
      aria-label="Promotions"
      className="relative border-b border-line bg-surface-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link
        href={active.href}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <div
          className={`relative overflow-hidden ${
            anyImage ? 'aspect-[16/9] max-h-[78vh]' : 'min-h-[84px]'
          }`}
        >
          {active.image && (
            // Decorative — the copy below carries the meaning, so it stays out
            // of the accessibility tree.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.02]"
            />
          )}

          <div
            className={`relative flex h-full flex-col items-center justify-center gap-3 px-12 py-8 text-center ${
              active.image
                ? 'bg-gradient-to-t from-black/70 via-black/25 to-black/40'
                : ''
            }`}
          >
            {active.headline && (
              <h2
                className={`font-display text-2xl font-semibold leading-tight tracking-wide sm:text-4xl lg:text-5xl ${
                  active.image ? 'text-white drop-shadow-sm' : 'text-ink'
                }`}
              >
                {active.headline}
              </h2>
            )}
            {active.subtext && (
              <p className={`max-w-2xl text-sm sm:text-base ${active.image ? 'text-white/85' : 'text-muted'}`}>
                {active.subtext}
              </p>
            )}
            {active.promoCode && (
              <span
                className={`mt-1 rounded border border-dashed px-3 py-1 font-mono text-xs tracking-[0.2em] sm:text-sm ${
                  active.image ? 'border-white/70 text-white' : 'border-gold text-gold'
                }`}
              >
                {active.promoCode}
              </span>
            )}
          </div>
        </div>
      </Link>

      {count > 1 && (
        <>
          {/* Arrows sit outside the Link so they change slides rather than navigating. */}
          <button
            type="button"
            aria-label="Previous promotion"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-2xl leading-none text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white sm:left-4"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next promotion"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-2xl leading-none text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white sm:right-4"
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Promotion ${i + 1} of ${count}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index ? 'bg-gold' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
