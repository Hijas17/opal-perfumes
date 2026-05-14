'use client'

/**
 * Apple-style scroll-controlled video player.
 *
 * Renders a frame sequence to a canvas, with the current frame index driven
 * by a Motion `MotionValue` (typically a useScroll progress value). Inspired
 * by apple.com product pages (AirPods Pro, iPhone) which use this exact
 * canvas + frame-sequence pattern.
 *
 * Frame files live in `/public/hero-frames/frame_001.webp` through
 * `frame_096.webp`. Add/remove frames by re-extracting via ffmpeg.
 */

import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, type MotionValue } from 'motion/react'

const TOTAL_FRAMES = 192
const FRAME_PATH   = (i: number) => `/hero-frames-cut/frame_${String(i).padStart(3, '0')}.webp`

interface HeroVideoCanvasProps {
  /** Scroll progress 0–1 — drives which frame is drawn */
  progress: MotionValue<number>
  /** Native width of the underlying frames (px). 720 in our case. */
  width?:  number
  /** Native height of the underlying frames (px). 406 in our case. */
  height?: number
  className?: string
}

export default function HeroVideoCanvas({
  progress,
  width  = 720,
  height = 406,
  className = '',
}: HeroVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [ready, setReady] = useState(false)

  // ── Preload all frames ──────────────────────────────────────────────
  useEffect(() => {
    const images: HTMLImageElement[] = []
    let firstFrameLoaded = false

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = FRAME_PATH(i + 1)
      img.onload = () => {
        if (!firstFrameLoaded && i === 0) {
          firstFrameLoaded = true
          drawFrame(0)
          setReady(true)
        }
      }
      images.push(img)
    }
    imagesRef.current = images

    function drawFrame(idx: number) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const safeIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(idx)))
      const img = images[safeIdx]
      if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
    }
    // Make drawFrame accessible to scroll handler
    drawFrameRef.current = drawFrame
  }, [])

  const drawFrameRef = useRef<((idx: number) => void) | null>(null)

  // ── Bind canvas drawing to scroll progress ─────────────────────────
  useMotionValueEvent(progress, 'change', (v) => {
    const idx = v * (TOTAL_FRAMES - 1)
    drawFrameRef.current?.(idx)
  })

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        display: 'block',
        // Fade in once the first frame is painted
        opacity: ready ? 1 : 0,
        transition: 'opacity 600ms ease',
      }}
      aria-hidden
    />
  )
}
