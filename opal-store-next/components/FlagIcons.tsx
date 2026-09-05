/**
 * Small inline flag marks for the currency selector.
 *
 * Drawn as SVG rather than emoji on purpose: Windows ships no flag glyphs, so
 * 🇦🇪 / 🇺🇸 render as bare letter pairs ("AE", "US") in Chrome on Windows —
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

export function UsFlag({ className = 'h-3 w-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 12" aria-hidden focusable="false">
      <rect width="18" height="12" fill="#ffffff" />
      {/* 7 red stripes across 13 bands */}
      {[0, 2, 4, 6, 8, 10].map((y) => (
        <rect key={y} x="0" y={y} width="18" height="1" fill="#b22234" />
      ))}
      <rect x="0" y="11.08" width="18" height="0.92" fill="#b22234" />
      <rect x="0" y="0" width="8" height="6.46" fill="#3c3b6e" />
    </svg>
  )
}
