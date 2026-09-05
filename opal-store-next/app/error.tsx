'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Route-level error boundary. Same shape as the 404 so an unexpected failure
 * still looks like part of the site rather than a raw stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface it for whoever is watching the server/browser console.
    console.error(error)
  }, [error])

  return (
    <div className="section-spacing bg-surface pt-16 md:pt-0">
      <div className="container-page container-page--xs flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="h5 text-ink">Something went wrong</h1>
        <p className="text-sm leading-relaxed text-muted">
          An unexpected error occurred. Please try again, or head back to the
          collection.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-4">
          <button type="button" onClick={reset} className="btn">
            Try again
          </button>
          <Link href="/products" className="btn btn--outline">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
