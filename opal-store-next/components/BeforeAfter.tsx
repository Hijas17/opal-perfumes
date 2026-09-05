'use client'

/**
 * Draggable before/after image comparator — the reference's `<before-after>`
 * section, rebuilt.
 *
 * Two full-bleed images stacked in a 16:9 frame; the top one is clipped to the
 * divider position. A 50×50 circular handle sits on the split and can be
 * dragged with a mouse/finger or moved with the arrow keys — the reference is
 * keyboard-accessible and so is this.
 *
 * Each half carries its own label and CTA, pinned bottom-left / bottom-right.
 */

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'

export interface BeforeAfterItem {
  image: string
  label: string
  href: string
  ctaLabel?: string
}

interface Props {
  before: BeforeAfterItem
  after: BeforeAfterItem
  /** Starting divider position, 0–100. */
  initial?: number
}

const STEP = 2

export default function BeforeAfter({ before, after, initial = 50 }: Props) {
  const [pos, setPos] = useState(initial)
  const frameRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    // Capture so the drag keeps tracking even when the pointer leaves the handle.
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setFromClientX(e.clientX)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    setFromClientX(e.clientX)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Functional updates, not `pos + STEP`: holding an arrow key fires repeats
    // faster than React re-renders, and reading `pos` from the closure makes
    // every repeat compute from the same stale value — so the divider moves
    // one step and then stops.
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    switch (e.key) {
      case 'ArrowLeft':  setPos((p) => clamp(p - STEP)); break
      case 'ArrowRight': setPos((p) => clamp(p + STEP)); break
      case 'Home':       setPos(0); break
      case 'End':        setPos(100); break
      default: return
    }
    e.preventDefault()
  }

  return (
    <div
      ref={frameRef}
      className="relative aspect-[16/9] w-full select-none overflow-hidden bg-surface"
    >
      {/* Base layer — the "after" half */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after.image} alt="" aria-hidden className="h-full w-full object-cover" />
      </div>

      {/* Clipped layer — the "before" half. clip-path keeps the image at full
          size, so it reveals rather than squashing as the divider moves. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before.image} alt="" aria-hidden className="h-full w-full object-cover" />
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-between p-6 md:p-10">
        <div className="pointer-events-auto flex flex-col items-start gap-4">
          <p className="h6 sm:h5 text-ink">{before.label}</p>
          <Link href={before.href} className="btn btn--outline">
            {before.ctaLabel || 'Buy now'}
          </Link>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-4 text-right">
          <p className="h6 sm:h5 text-ink">{after.label}</p>
          <Link href={after.href} className="btn btn--outline">
            {after.ctaLabel || 'Buy now'}
          </Link>
        </div>
      </div>

      {/* Divider + handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Drag to compare"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 z-[2] w-[50px] cursor-ew-resize touch-none focus:outline-none"
        style={{ left: `calc(${pos}% - 25px)` }}
      >
        <span className="sr-only">
          Use the left and right arrow keys to compare the two images.
        </span>

        {/* Hairline down the split */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gold/40"
        />

        {/* 50×50 handle, centred on the split */}
        <svg
          aria-hidden
          focusable="false"
          width="50"
          height="50"
          viewBox="0 0 50 50"
          fill="none"
          className="absolute left-0 top-1/2 -translate-y-1/2"
        >
          <rect width="50" height="50" rx="25" fill="#000000" stroke="#c2a661" strokeWidth="1" />
          <path
            d="m19.25 19-6 6 6 6m11.5 0 6-6-6-6"
            stroke="#c2a661"
            strokeWidth=".75"
            strokeLinecap="square"
          />
        </svg>
      </div>
    </div>
  )
}
