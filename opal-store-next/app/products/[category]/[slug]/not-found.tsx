import Link from 'next/link'

/** Product-level 404 — same shape as the global one, scoped copy. */
export default function NotFound() {
  return (
    <div className="section-spacing bg-surface pt-16 md:pt-0">
      <div className="container-page container-page--xs flex flex-col items-center gap-6 py-16 text-center">
        <h1 className="h5 text-ink">404</h1>
        <p className="text-sm leading-relaxed text-muted">
          The product you are looking for does not exist or has been removed.
          Please use the navigation or the button below to keep browsing.
        </p>
        <Link href="/products" className="btn mt-2">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
