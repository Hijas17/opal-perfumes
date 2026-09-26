import type { NextConfig } from 'next'

// Parse the uploads URL into protocol/hostname/port for next/image remotePatterns.
// Works for both local dev (http://localhost:8000/uploads) and production
// (https://opal-api.fly.dev/uploads).
const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8000/uploads'
let protocol: 'http' | 'https' = 'http'
let hostname = 'localhost'
let port: string | undefined = '8000'
try {
  const u = new URL(uploadsUrl)
  protocol = u.protocol.replace(':', '') === 'https' ? 'https' : 'http'
  hostname = u.hostname
  port = u.port || undefined
} catch {
  /* fall through to defaults */
}

// The browser talks to the PHP API directly, so its origin must be allowed by
// connect-src or every fetch from the storefront is blocked.
let apiOrigin = ''
try {
  apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').origin
} catch {
  /* leave empty — 'self' still covers same-origin setups */
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow next/image to optimise images served by the PHP API
  images: {
    // Required for the localhost dev API. Safe in prod since prod uses a public hostname.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // The configured API host (local or production)
      { protocol, hostname, ...(port ? { port } : {}), pathname: '/uploads/**' },
      // External images allowed (e.g. Google Drive bulk import results)
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },

  /**
   * Content Security Policy.
   *
   * Stripe.js relies on the page having a CSP to hold up its own XSS
   * protections, and the payment iframe simply will not load without
   * `frame-src`/`script-src` entries for Stripe. `*.link.com` covers Link,
   * Stripe's saved-details checkout.
   *
   * `'unsafe-inline'` on script-src is required by Next.js's inlined
   * hydration bootstrap; tightening it means moving to nonces.
   *
   * Nominatim (OpenStreetMap) is the reverse geocoder behind the delivery
   * location picker's "Use my location".
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      `img-src 'self' data: blob: https:`,
      `connect-src 'self' https://api.stripe.com https://*.stripe.com https://nominatim.openstreetmap.org ${apiOrigin}`.trim(),
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://*.link.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },

  // Performance
  compress: true,
  poweredByHeader: false,
}

export default nextConfig
