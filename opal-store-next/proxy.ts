import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Temporary "Coming Soon" gate.
 *
 * When NEXT_PUBLIC_COMING_SOON=true, every route except the home page and the
 * contact page is redirected to `/` (which renders the Coming Soon shell — see
 * app/page.tsx). This hides all product/cart/checkout/account/auth routes
 * without deleting them. When the flag is off this proxy is a no-op, so the
 * storefront behaves exactly as before.
 *
 * Next 16 renamed the `middleware` convention to `proxy` (function `proxy`,
 * file `proxy.ts`). Runtime defaults to Node.js, so process.env is available.
 */

// Paths that stay reachable while Coming Soon is on.
const ALLOWED = new Set(['/', '/contact'])

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_COMING_SOON !== 'true') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  if (ALLOWED.has(pathname)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  // Run on everything except Next internals, API routes, and static assets
  // (anything with a file extension, e.g. /logo.png, /og-cover.jpg).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)',
  ],
}
