/**
 * Decorative SVG bottle used as a fallback when the admin hasn't uploaded
 * a hero_bottle_image. Pure SVG — renders fine in Server or Client Components.
 */
export default function PerfumeBottleSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 -24 200 404"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#2a1f08" />
          <stop offset="30%"  stopColor="#a67b30" />
          <stop offset="55%"  stopColor="#f0c96a" />
          <stop offset="80%"  stopColor="#a67b30" />
          <stop offset="100%" stopColor="#2a1f08" />
        </linearGradient>
        <linearGradient id="neckGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1a1000" />
          <stop offset="40%"  stopColor="#c9922a" />
          <stop offset="60%"  stopColor="#e8c05a" />
          <stop offset="100%" stopColor="#1a1000" />
        </linearGradient>
        <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0d0d0d" />
          <stop offset="35%"  stopColor="#3a3a3a" />
          <stop offset="60%"  stopColor="#888" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
        <linearGradient id="labelBorder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#a67b30" stopOpacity="0.15" />
          <stop offset="50%"  stopColor="#d4a843" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a67b30" stopOpacity="0.15" />
        </linearGradient>
        <filter id="bottleGlow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softBlur"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>

      {/* Spray mist */}
      <g opacity="0.55" filter="url(#bottleGlow)">
        <path d="M87 8 C85 4 83 1 79 -2"  stroke="#d4a843" strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M100 7 C100 3 100 0 100 -5" stroke="#d4a843" strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M113 8 C115 4 117 1 121 -2" stroke="#d4a843" strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <circle cx="79"  cy="-3"  r="2.2" fill="#d4a843" opacity="0.75" />
        <circle cx="100" cy="-6"  r="1.8" fill="#d4a843" opacity="0.65" />
        <circle cx="121" cy="-3"  r="2.2" fill="#d4a843" opacity="0.75" />
        <circle cx="73"  cy="3"   r="1.2" fill="#d4a843" opacity="0.35" />
        <circle cx="127" cy="3"   r="1.2" fill="#d4a843" opacity="0.35" />
        <circle cx="91"  cy="-12" r="1.0" fill="#d4a843" opacity="0.25" />
        <circle cx="109" cy="-14" r="0.8" fill="#d4a843" opacity="0.20" />
        <circle cx="94"  cy="-18" r="0.6" fill="#d4a843" opacity="0.15" />
      </g>

      <rect x="72" y="10" width="56" height="68" rx="6" fill="url(#capGrad)" />
      <rect x="78" y="14" width="8"  height="60" rx="2" fill="rgba(255,255,255,0.06)" />
      <line x1="73" y1="30" x2="127" y2="30" stroke="rgba(255,255,255,0.055)" strokeWidth="0.7" />
      <line x1="73" y1="48" x2="127" y2="48" stroke="rgba(255,255,255,0.055)" strokeWidth="0.7" />
      <line x1="73" y1="65" x2="127" y2="65" stroke="rgba(255,255,255,0.055)" strokeWidth="0.7" />

      <rect x="68" y="72" width="64" height="10" rx="3" fill="#222" />
      <line x1="68" y1="76" x2="132" y2="76" stroke="rgba(166,123,48,0.40)" strokeWidth="0.7" />

      <rect x="80" y="82" width="40" height="40" rx="4" fill="url(#neckGrad)" />
      <rect x="84" y="84" width="6" height="36" rx="2" fill="rgba(255,255,255,0.07)" />

      <path d="M60 122 Q60 138 48 148 L48 330 Q48 340 56 344 L144 344 Q152 340 152 330 L152 148 Q140 138 140 122 Z"
        fill="url(#bottleGrad)" />

      <path d="M88 148 Q90 210 88 330" stroke="rgba(255,255,255,0.22)" strokeWidth="7" strokeLinecap="round" />
      <path d="M96 148 Q98 210 96 330" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
      <path d="M138 158 Q140 230 138 326" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />

      <rect x="56" y="188" width="88" height="98" rx="5" fill="rgba(0,0,0,0.38)" />
      <rect x="56" y="188" width="88" height="98" rx="5" fill="none" stroke="url(#labelBorder)" strokeWidth="0.8" />
      <line x1="63" y1="196" x2="133" y2="196" stroke="rgba(166,123,48,0.40)" strokeWidth="0.6" />
      <line x1="63" y1="278" x2="133" y2="278" stroke="rgba(166,123,48,0.40)" strokeWidth="0.6" />
      <text x="100" y="228" textAnchor="middle" fill="#d4a843" fontFamily="serif" fontSize="14" fontStyle="italic" fontWeight="600" letterSpacing="2">Opal</text>
      <text x="100" y="248" textAnchor="middle" fill="rgba(255,255,255,0.58)" fontFamily="sans-serif" fontSize="6.5" letterSpacing="5">PERFUMES</text>
      <line x1="68" y1="257" x2="132" y2="257" stroke="rgba(166,123,48,0.42)" strokeWidth="0.5" />
      <text x="100" y="268" textAnchor="middle" fill="rgba(200,160,80,0.42)" fontFamily="sans-serif" fontSize="5.2" letterSpacing="3">EAU DE PARFUM</text>

      <rect x="50" y="340" width="100" height="16" rx="5" fill="#1a1000" />
      <rect x="56" y="340" width="8" height="16" rx="2" fill="rgba(255,255,255,0.04)" />
      <line x1="51" y1="341" x2="149" y2="341" stroke="rgba(166,123,48,0.22)" strokeWidth="0.7" />

      <ellipse cx="100" cy="360" rx="46" ry="7" fill="url(#bottleGrad)" opacity="0.14" filter="url(#softBlur)" />
      <ellipse cx="100" cy="365" rx="32" ry="4" fill="#a67b30" opacity="0.08" filter="url(#softBlur)" />
    </svg>
  )
}
