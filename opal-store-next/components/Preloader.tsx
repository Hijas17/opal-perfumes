'use client'

/**
 * Opal Perfume — full-screen brand reveal.
 *
 * Shows ONCE per visit: on the first page a visitor lands on, and not again
 * while that browser tab is open. Two things enforce that —
 *   1. the effect has no dependencies, and the root layout persists across
 *      client-side navigation, so it never re-runs when moving between pages;
 *   2. a sessionStorage flag covers full reloads within the same session.
 *
 * The check runs in a layout effect so a repeat visit never paints a frame of
 * the loader before it is removed. (The reference fires on every navigation;
 * this is a deliberate departure.)
 *
 * Runs a fixed 2s eased bar, swaps its label to "Welcome", holds, then fades —
 * ~3.5s on screen in total.
 *
 * The bar itself is animated purely in CSS (see .preloader__fill). State here
 * is limited to the three real transitions — done -> fading -> unmounted —
 * driven by setTimeout rather than per-frame JS. That matters: rAF is paused
 * outright in a backgrounded tab and setInterval is heavily throttled there, so
 * a JS-driven bar leaves the loader stuck on screen for anyone who opens the
 * site in a background tab. setTimeout still fires, so the loader always clears.
 *
 * Timings must stay in sync with the `.preloader*` rules in globals.css,
 * particularly FADE_MS and the CSS `transition: opacity 1s`.
 */

import { useEffect, useLayoutEffect, useState } from 'react'

const SEEN_KEY = 'opal:preloader-seen'

/** useLayoutEffect on the client, useEffect on the server (which never runs it). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

const DURATION_MS = 2000   // progress bar fill time
const HOLD_MS     = 500    // pause on "Welcome" before fading
const FADE_MS     = 1000   // matches the CSS transition on .preloader

interface Props {
  /** Used as the logo's alt text. */
  brandName?: string
}

export default function Preloader({ brandName = 'Opal Perfume' }: Props) {
  const [done, setDone] = useState(false)   // bar full, label reads "Welcome"
  const [gone, setGone] = useState(false)   // fade-out class applied
  const [unmounted, setUnmounted] = useState(false)

  useIsomorphicLayoutEffect(() => {
    let alreadySeen = false
    try {
      alreadySeen = window.sessionStorage.getItem(SEEN_KEY) === '1'
      if (!alreadySeen) window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Private mode / blocked storage: fall through and just show it.
    }

    if (alreadySeen) {
      setUnmounted(true)
      return
    }

    document.documentElement.classList.add('preloader-active')

    const timers: number[] = []
    timers.push(
      window.setTimeout(() => {
        setDone(true)
        timers.push(
          window.setTimeout(() => {
            document.documentElement.classList.remove('preloader-active')
            setGone(true)
            timers.push(window.setTimeout(() => setUnmounted(true), FADE_MS))
          }, HOLD_MS),
        )
      }, DURATION_MS),
    )

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      document.documentElement.classList.remove('preloader-active')
    }
    // No deps: the root layout persists across client-side navigation, so this
    // runs once per full page load and never on route changes.
  }, [])

  if (unmounted) return null

  return (
    <div
      className={`preloader${gone ? ' is-done' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="preloader__smoke preloader__smoke--left" aria-hidden />
      <div className="preloader__smoke preloader__smoke--right" aria-hidden />

      <div className="preloader__text">
        {/* Plain <img>, not next/image — the whole point of a preloader is to
            paint immediately, before the optimisation pipeline finishes. */}
        <img
          src="/logo-preloader.png"
          alt={brandName}
          className="preloader__logo"
        />
      </div>

      <div className="preloader__loader">
        <span className="preloader__label">{done ? 'Welcome' : 'Loading...'}</span>
        <div className="preloader__track">
          <div className="preloader__fill" />
        </div>
      </div>
    </div>
  )
}
