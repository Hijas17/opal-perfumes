import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
}

/**
 * Global 404. Follows the reference's own 404: full site chrome, a raised
 * surface, and the "404" heading rendered as a small TRACKED LABEL rather than
 * a large display numeral — then one line of copy and a single CTA.
 */
export default function NotFound() {
  return (
    <div className="section-spacing bg-surface pt-16 md:pt-0">
      <div className="container-page container-page--xs flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="h5 text-ink">404</h1>
        <p className="text-sm leading-relaxed text-muted">
          We could not find the page you were looking for. Please use the
          navigation or the button below to go back to our website.
        </p>
        <Link href="/products" className="btn mt-2">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
