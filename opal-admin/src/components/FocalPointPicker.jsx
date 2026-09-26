import React, { useRef, useState } from 'react'
import { Move } from 'lucide-react'

/**
 * Drag-to-position preview for a full-bleed image, like repositioning a
 * profile photo.
 *
 * The storefront shows the image with `object-fit: cover`, which crops
 * whatever overflows the frame, and `object-position: x% y%`, which slides
 * the visible window across the image. Both frames here render the image the
 * same way, so dragging in them edits exactly what the site will show:
 *
 *   - the PHONE frame is tall, so the image overflows sideways → drag left/right;
 *   - the DESKTOP frame is wide, so it overflows top/bottom → drag up/down.
 *
 * One {x, y} (0–100) drives both, since each frame only crops along one axis.
 * Frame shapes approximate the real hero: an upright phone below the header,
 * and a typical laptop/desktop window.
 */

const clamp = (n) => Math.max(0, Math.min(100, n))

function Frame({ src, pos, onChange, label, className }) {
  const boxRef = useRef(null)
  const natural = useRef({ w: 0, h: 0 })
  const drag = useRef(null)
  const [axis, setAxis] = useState('both') // which way this frame can move

  // How far the covered image overflows the frame, in px, along each axis.
  const overflow = () => {
    const box = boxRef.current?.getBoundingClientRect()
    const { w, h } = natural.current
    if (!box || !w || !h) return { x: 0, y: 0 }
    const scale = Math.max(box.width / w, box.height / h)
    return { x: w * scale - box.width, y: h * scale - box.height }
  }

  const onLoad = (e) => {
    natural.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }
    const o = overflow()
    setAxis(o.x > 1 && o.y > 1 ? 'both' : o.x > 1 ? 'x' : o.y > 1 ? 'y' : 'none')
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, o: overflow() }
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    // Dragging the picture right reveals more of its left side, i.e. moves
    // the window towards 0%.
    const x = d.o.x > 1 ? clamp(d.x - ((e.clientX - d.px) / d.o.x) * 100) : d.x
    const y = d.o.y > 1 ? clamp(d.y - ((e.clientY - d.py) / d.o.y) * 100) : d.y
    onChange({ x: Math.round(x), y: Math.round(y) })
  }

  const onPointerUp = () => { drag.current = null }

  // Arrow keys nudge by 2%, matching the drag direction.
  const onKeyDown = (e) => {
    const step = { ArrowLeft: [2, 0], ArrowRight: [-2, 0], ArrowUp: [0, 2], ArrowDown: [0, -2] }[e.key]
    if (!step) return
    e.preventDefault()
    onChange({ x: clamp(pos.x + step[0]), y: clamp(pos.y + step[1]) })
  }

  const cursor = { both: 'cursor-move', x: 'cursor-ew-resize', y: 'cursor-ns-resize', none: 'cursor-default' }[axis]
  const hint = { both: 'Drag to position', x: 'Drag left / right', y: 'Drag up / down', none: 'Fits without cropping' }[axis]

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} image position`}
        aria-valuetext={`${pos.x}% across, ${pos.y}% down`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`relative touch-none select-none overflow-hidden rounded-md border border-border bg-black outline-none focus-visible:ring-2 focus-visible:ring-gold ${cursor} ${className}`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={onLoad}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
        />
        <Move className="pointer-events-none absolute bottom-1.5 right-1.5 h-4 w-4 text-white/70 drop-shadow" aria-hidden />
      </div>
    </div>
  )
}

export default function FocalPointPicker({ src, value, onChange }) {
  const pos = {
    x: Number.isFinite(value?.x) ? value.x : 50,
    y: Number.isFinite(value?.y) ? value.y : 50,
  }
  const centred = pos.x === 50 && pos.y === 50

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-4">
        <Frame src={src} pos={pos} onChange={onChange} label="Phone" className="aspect-[9/14] w-[130px]" />
        <Frame src={src} pos={pos} onChange={onChange} label="Desktop" className="aspect-[2/1] w-[260px] max-w-full" />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Drag the picture so the important part is inside both frames.</span>
        {!centred && (
          <button type="button" onClick={() => onChange({ x: 50, y: 50 })} className="text-gold hover:underline">
            Reset to centre
          </button>
        )}
      </div>
    </div>
  )
}
