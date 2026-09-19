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
 * The promotional strip directly under the navbar on the home page.
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
        <div className="relative overflow-hidden">
          {active.image && (
            // Background art. Decorative — the text below carries the meaning,
            // so it stays out of the accessibility tree.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
            />
          )}

          <div
            className={
              active.image
                ? 'relative flex min-h-[72px] items-center justify-center gap-x-4 gap-y-1 px-12 py-3 text-center bg-gradient-to-r from-black/55 via-black/35 to-black/55 sm:min-h-[88px]'
                : 'relative flex min-h-[56px] items-center justify-center gap-x-4 gap-y-1 px-12 py-3 text-center'
            }
          >
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {active.headline && (
                <span
                  className={`text-sm font-medium tracking-wide sm:text-base ${
                    active.image ? 'text-white' : 'text-ink'
                  }`}
                >
                  {active.headline}
                </span>
              )}
              {active.subtext && (
                <span className={`text-xs sm:text-sm ${active.image ? 'text-white/80' : 'text-muted'}`}>
                  {active.subtext}
                </span>
              )}
              {active.promoCode && (
                <span
                  className={`rounded border border-dashed px-2 py-0.5 font-mono text-xs tracking-widest ${
                    active.image
                      ? 'border-white/60 text-white'
                      : 'border-gold text-gold'
                  }`}
                >
                  {active.promoCode}
                </span>
              )}
            </p>
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
            className="absolute left-1 top-1/2 -translate-y-1/2 px-2 py-1 text-lg leading-none text-muted transition-colors hover:text-gold"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next promotion"
            onClick={() => go(index + 1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-lg leading-none text-muted transition-colors hover:text-gold"
          >
            ›
          </button>

          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Promotion ${i + 1} of ${count}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-gold' : 'bg-muted/40 hover:bg-muted'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
