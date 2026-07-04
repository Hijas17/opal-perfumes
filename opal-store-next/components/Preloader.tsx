'use client'

/**
 * Opal Perfume — home-page preloader.
 *
 * Shows a full-screen brand reveal whenever the user lands on `/` — both on
 * initial hard load and on client-side navigation back to home. Any other
 * route: silent, no preloader.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const MIN_DISPLAY_MS = 1400  // deliberate luxury reveal, matches the initial-load feel
const FADE_OUT_MS    = 700   // matches CSS transition on .opal-preloader

type Phase = 'showing' | 'fading' | 'gone'

export default function Preloader() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>(pathname === '/' ? 'showing' : 'gone')

  useEffect(() => {
    if (pathname !== '/') {
      setPhase('gone')
      return
    }

    // Restart the reveal cycle every time we land on home.
    setPhase('showing')
    const start = Date.now()

    const dismiss = () => {
      const elapsed = Date.now() - start
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed)
      const t1 = window.setTimeout(() => {
        setPhase('fading')
        const t2 = window.setTimeout(() => setPhase('gone'), FADE_OUT_MS)
        cleanupFns.push(() => window.clearTimeout(t2))
      }, wait)
      cleanupFns.push(() => window.clearTimeout(t1))
    }

    const cleanupFns: Array<() => void> = []

    if (document.readyState === 'complete') {
      dismiss()
    } else {
      window.addEventListener('load', dismiss, { once: true })
      // Safety net: dismiss anyway after 4s even if `load` never fires
      const failsafe = window.setTimeout(dismiss, 4000)
      cleanupFns.push(() => {
        window.removeEventListener('load', dismiss)
        window.clearTimeout(failsafe)
      })
    }

    return () => {
      cleanupFns.forEach((fn) => fn())
    }
  }, [pathname])

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
          src="/logo-icon.png"
          alt="Opal Perfume"
          width={512}
          height={512}
          className="opal-preloader__logo"
        />
      </div>
    </div>
  )
}
