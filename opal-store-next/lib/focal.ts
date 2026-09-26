/* ──────────────────────────────────────────────────────────────────────────
   Admin-chosen image positions.

   Every admin-managed image that is shown with `object-fit: cover` can carry
   a focal point the admin sets by dragging the picture in preview frames (see
   FocalPointPicker in the admin). It is stored as { x, y } percentages —
   either as a `focal` field beside the image in an object, or as a sibling
   `<image key>_focal` setting — and applied as CSS object-position, which is
   exactly how the admin previews render it.
   ────────────────────────────────────────────────────────────────────────── */

export interface Focal {
  x?: number
  y?: number
}

const pct = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50

/**
 * CSS object-position for a stored focal point, or `fallback` when none has
 * been saved (or it is malformed).
 */
export function focalPosition(value: unknown, fallback = '50% 50%'): string {
  if (!value || typeof value !== 'object') return fallback
  const f = value as Focal
  return `${pct(f.x)}% ${pct(f.y)}%`
}
