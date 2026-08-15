import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="pt-[70px] min-h-screen flex flex-col items-center justify-center px-4 text-center bg-surface">
      <h1 className="font-display text-7xl font-semibold text-muted-2 mb-4">404</h1>
      <h2 className="font-display text-2xl text-ink mb-3">Product Not Found</h2>
      <p className="text-muted mb-8">The product you&rsquo;re looking for doesn&rsquo;t exist or has been removed.</p>
      <Link href="/products"
        className="inline-block bg-gold text-white px-8 py-3 text-sm rounded-[var(--radius-btn)] btn-3d hover:bg-[#8a6420] transition-colors duration-300">
        Browse All Products
      </Link>
    </div>
  )
}
