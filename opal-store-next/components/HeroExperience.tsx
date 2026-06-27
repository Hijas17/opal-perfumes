'use client'

/**
 * Apple-style scroll-driven hero with frame-sequence video.
 *
 * Layout:
 * - Sticky stage pinned to top of viewport
 * - Scroll-controlled <canvas> plays through pre-extracted video frames
 * - Five text "scenes" cross-fade above the canvas as scroll progresses
 * - Only Scene 1 uses the massive display headline; Scenes 2-5 use body text
 *   to keep focus on the product reveal
 *
 * Inspired by apple.com/iphone & apple.com/airpods-pro.
 */

import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from 'motion/react'
import HeroVideoCanvas from './HeroVideoCanvas'

interface HeroExperienceProps {
  heroTagline:  string
  heroHeadline: string
  heroSubtext:  string
  brandName:    string
}

export default function HeroExperience({
  heroTagline,
  heroHeadline,
  heroSubtext,
}: HeroExperienceProps) {
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  // ── Five scenes — sequential transitions, NO opacity overlap ────────
  //
  // Each scene fades fully OUT before the next fades IN. Combined with the
  // visibility:hidden hack on the Scene wrapper (when opacity < 0.02), this
  // guarantees only one scene is ever readable at a time. Each scene also
  // floats vertically (+50 → 0 → -50) for that Apple "content sliding through"
  // feel.
  //
  // Time anchors per scene:
  //   1: visible 0.00–0.15  | exits  0.15–0.18
  //   2: enters  0.18–0.21  | visible 0.21–0.36 | exits 0.36–0.39
  //   3: enters  0.39–0.42  | visible 0.42–0.56 | exits 0.56–0.59
  //   4: enters  0.59–0.62  | visible 0.62–0.76 | exits 0.76–0.79
  //   5: enters  0.79–0.82  | visible 0.82–1.00
  const TRAVEL = 40           // px each scene travels on enter/exit

  const sceneOneOpacity   = useTransform(scrollYProgress, [0.00, 0.15, 0.18], [1, 1, 0])
  const sceneOneY         = useTransform(scrollYProgress, [0.00, 0.15, 0.18], [0, 0, -TRAVEL])

  const sceneTwoOpacity   = useTransform(scrollYProgress, [0.18, 0.21, 0.36, 0.39], [0, 1, 1, 0])
  const sceneTwoY         = useTransform(scrollYProgress, [0.18, 0.21, 0.36, 0.39], [TRAVEL, 0, 0, -TRAVEL])

  const sceneThreeOpacity = useTransform(scrollYProgress, [0.39, 0.42, 0.56, 0.59], [0, 1, 1, 0])
  const sceneThreeY       = useTransform(scrollYProgress, [0.39, 0.42, 0.56, 0.59], [TRAVEL, 0, 0, -TRAVEL])

  const sceneFourOpacity  = useTransform(scrollYProgress, [0.59, 0.62, 0.76, 0.79], [0, 1, 1, 0])
  const sceneFourY        = useTransform(scrollYProgress, [0.59, 0.62, 0.76, 0.79], [TRAVEL, 0, 0, -TRAVEL])

  const sceneFiveOpacity  = useTransform(scrollYProgress, [0.79, 0.82, 1.00], [0, 1, 1])
  const sceneFiveY        = useTransform(scrollYProgress, [0.79, 0.82, 1.00], [TRAVEL, 0, 0])

  // Scroll cue fades almost immediately
  const scrollCueOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0])

  return (
    <section
      ref={containerRef}
      className="h-[800vh] z-0"     /* 5 scenes × ~160vh each — gives breathing room when scrolling fast */
      style={{ position: 'relative', marginTop: '-70px' }}
    >
      {/* Sticky stage: stays pinned to top of viewport while we scroll */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-white">

        {/* ── Video canvas — RIGHT-ALIGNED, capped at 860px so the bottle
            looks smaller and sits further right inside the container.
            The leftover space inside the 80% container now lives on the
            LEFT of the canvas, providing extra room for the text-area
            gradient + left edge fade. */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[80%] flex items-center justify-end pointer-events-none">
          {/* Tight box around the canvas — overlays MUST live inside this
              wrapper so their top-0/right-0/bottom-0/left-0 anchor to the
              actual canvas edges. Before, overlays were positioned to the
              outer flex container, which left empty space between them
              and the (centred) canvas — making the fades invisible. */}
          <div className="relative w-full max-w-[860px]">
            <HeroVideoCanvas
              progress={scrollYProgress}
              className="block w-full h-auto max-h-[78vh] object-contain relative z-0"
            />

            {/* Edge fades — physical white overlays feather the canvas
                rectangle into the page background on ALL FOUR sides.
                Gradient curve drops opacity FAST after the edge so the
                cloud is concentrated where the frame line would be, not
                bleeding into the bottle. Stops:
                  0%   → solid white (kills any rectangle outline)
                  12%  → 80% white  (still very opaque)
                  40%  → 20% white  (light haze)
                  75%  → transparent (clear from here inward) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-40"
              style={{
                background:
                  'linear-gradient(to bottom, #ffffff 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 75%)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-44"
              style={{
                background:
                  'linear-gradient(to left, #ffffff 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 75%)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-56"
              style={{
                background:
                  'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 75%)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-56"
              style={{
                background:
                  'linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 75%)',
              }}
            />
          </div>
        </div>

        {/* ── Left fade-to-white gradient ─────────────────────────────
            Solid white covers the leftmost ~22% of viewport, then fades to
            transparent over the next ~18% so any explosion debris that
            reaches the left edge of the (smaller) video disappears into
            white instead of looking cropped. */}
        <div
          className="absolute inset-y-0 left-0 w-full sm:w-[55%] lg:w-[40%] pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(to right, rgb(255,255,255) 0%, rgb(255,255,255) 55%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* ── Scene 1 — Hero (only one with the massive display headline) ─ */}
        <Scene opacity={sceneOneOpacity} y={sceneOneY}>
          <p className="opal-eyebrow">{heroTagline || 'Luxury Fragrances'}</p>
          <h1 className="opal-display">
            {(heroHeadline || 'Discover\nyour scent.').split('\n').map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="opal-body mt-6">
            {heroSubtext ||
              'Handcrafted luxury perfumes that tell your story. Each bottle a masterpiece.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/products" className="opal-cta-primary">Shop Now</Link>
            <Link href="/about"    className="opal-cta-ghost">Learn More</Link>
          </div>
        </Scene>

        {/* ── Scene 2 — The Process ───────────────────────────────── */}
        <Scene opacity={sceneTwoOpacity} y={sceneTwoY}>
          <p className="opal-eyebrow">The Process</p>
          <p className="opal-body opal-body--lead">
            Every fragrance begins with a single drop &mdash; a memory, a place, a feeling.
            Our perfumers blend the world&rsquo;s rarest oud, sandalwood and oriental notes
            into compositions designed to last from morning until night.
          </p>
        </Scene>

        {/* ── Scene 3 — Born in the UAE ───────────────────────────── */}
        <Scene opacity={sceneThreeOpacity} y={sceneThreeY}>
          <p className="opal-eyebrow">Born in the UAE</p>
          <p className="opal-body opal-body--lead">
            Crafted in Dubai with ingredients sourced across the Middle East, India and Europe.
            Each bottle is finished by hand and inspected before it leaves our atelier.
          </p>
        </Scene>

        {/* ── Scene 4 — The Composition ───────────────────────────── */}
        <Scene opacity={sceneFourOpacity} y={sceneFourY}>
          <p className="opal-eyebrow">The Composition</p>
          <p className="opal-body opal-body--lead">
            Top notes of fresh fruit and citrus open the experience, giving way to a heart
            of pure oud and warm spice, settling into a base of sandalwood and amber that
            lingers for hours.
          </p>
        </Scene>

        {/* ── Scene 5 — Invitation + CTA ──────────────────────────── */}
        <Scene opacity={sceneFiveOpacity} y={sceneFiveY}>
          <p className="opal-eyebrow">Find your signature</p>
          <p className="opal-body opal-body--lead">
            For the bold. For the few. Discover the fragrance that tells your story.
          </p>
          <div className="mt-8 flex">
            <Link href="/products" className="opal-cta-primary">Explore the Collection</Link>
          </div>
        </Scene>

        {/* ── Scroll cue ──────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-8 left-8 sm:left-16 flex items-center gap-3 text-[#2a1000]/35 z-30"
          style={{ opacity: scrollCueOpacity }}
        >
          <div className="w-px h-12 bg-[#2a1000]/20 opal-scroll-line" />
          <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Scene wrapper ────────────────────────────────────────────────────
// All scenes share the same position: left side, vertically centred,
// constrained to ~half the viewport so they never overlap the video.
// `y` is a small px translate (~+50 → 0 → -50) that pairs with the opacity
// fade to give an Apple-style "content sliding through" feel.
interface SceneProps {
  opacity: MotionValue<number>
  y:       MotionValue<number>
  children: React.ReactNode
}

function Scene({ opacity, y, children }: SceneProps) {
  // Track when this scene's opacity is essentially zero so we can hide it
  // completely via `visibility: hidden`. Without this, very large display
  // text remains readable even at ~5% opacity, leaving a "ghost" of the
  // previous scene visible during transitions.
  const [active, setActive] = useState(true)
  useMotionValueEvent(opacity, 'change', (v) => {
    setActive(v > 0.02)
  })

  return (
    // Outer: absolute centring (no animation)
    <div
      className="
        absolute z-20
        left-6 sm:left-12 lg:left-24
        top-1/2 -translate-y-1/2
        max-w-[90%] sm:max-w-lg lg:max-w-xl lg:w-[42%]
        px-4 lg:px-0
      "
      style={{
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      {/* Inner: scroll-driven opacity + Y offset */}
      <motion.div
        style={{ opacity, y }}
        className="flex flex-col will-change-[transform,opacity]"
        initial={false}
      >
        {children}
      </motion.div>
    </div>
  )
}
