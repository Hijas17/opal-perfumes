'use client'

/**
 * Opal Perfumes — initial-load preloader.
 *
 * Renders SSR so it paints in the first HTML frame. After mount, it waits
 * for `window.load` (assets done) AND a minimum display time (luxury reveal),
 * then smoothly fades out. Only triggers on full page loads — Next.js
 * client-side navigation skips it entirely, like Apple's site.
 */

import { useEffect, useState } from 'react'

const MIN_DISPLAY_MS = 1400  // luxury slow reveal — feels deliberate, not slow
const FADE_OUT_MS    = 700   // matches CSS transition

export default function Preloader() {
  const [phase, setPhase] = useState<'showing' | 'fading' | 'gone'>('showing')

  useEffect(() => {
    const start = Date.now()

    const dismiss = () => {
      const elapsed = Date.now() - start
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed)
      setTimeout(() => {
        setPhase('fading')
        setTimeout(() => setPhase('gone'), FADE_OUT_MS)
      }, wait)
    }

    if (document.readyState === 'complete') {
      dismiss()
    } else {
      window.addEventListener('load', dismiss, { once: true })
      // Safety net: dismiss anyway after 4s even if `load` never fires
      const failsafe = setTimeout(dismiss, 4000)
      return () => {
        window.removeEventListener('load', dismiss)
        clearTimeout(failsafe)
      }
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      data-fading={phase === 'fading' ? 'true' : 'false'}
      className="opal-preloader"
    >
      <div className="opal-preloader__inner">
        {/* Plain <img> (not next/image) so the logo paints in the very first
            render — the whole point of the preloader is instant visibility,
            before Next.js's optimised image pipeline finishes. */}
        <img
          src="/logo.png"
          alt="Opal Perfumes"
          width={752}
          height={730}
          className="opal-preloader__logo"
        />
        <div className="opal-preloader__dots" aria-label="Loading">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}
