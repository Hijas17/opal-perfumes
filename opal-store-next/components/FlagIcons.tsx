/**
 * Small inline flag mark for the header's UAE label.
 *
 * Drawn as SVG rather than emoji on purpose: Windows ships no flag glyphs, so
 * 🇦🇪 renders as a bare letter pair ("AE") in Chrome on Windows —
 * which is most of this store's desktop traffic.
 */

export function UaeFlag({ className = 'h-3 w-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 12" aria-hidden focusable="false">
      <rect x="4" y="0" width="14" height="4" fill="#00732f" />
      <rect x="4" y="4" width="14" height="4" fill="#ffffff" />
      <rect x="4" y="8" width="14" height="4" fill="#000000" />
      <rect x="0" y="0" width="4" height="12" fill="#ff0000" />
    </svg>
  )
}
