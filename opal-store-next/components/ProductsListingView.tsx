/**
 * Shared listing view rendered by both /products and /products/[category].
 * Pure Server Component — no client-side data fetching.
 */

import Link from 'next/link'
import { getProducts, getCategories } from '@/lib/api'
import ProductCard from './ProductCard'
import SortSelect from './SortSelect'

interface Props {
  categorySlug?: string
  sort?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function ProductsListingView({ categorySlug, sort = '' }: Props) {
  const [products, categories] = await Promise.all([
    getProducts({ category: categorySlug, sort }),
    getCategories(),
  ])

  const currentCategory = categories.find((c) => c.slug === categorySlug)
  const pageTitle = categorySlug ? currentCategory?.name || categorySlug : 'All Products'

  // ── JSON-LD CollectionPage + ItemList ────────────────────────────────
  const seoUrl    = categorySlug ? `/products/${categorySlug}` : '/products'
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': pageTitle,
    'url':  `${SITE_URL}${seoUrl}`,
    'mainEntity': {
      '@type': 'ItemList',
      'name': pageTitle,
      'numberOfItems': products.length,
      'itemListElement': products.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `${SITE_URL}/products/${p.subcategory_slug || categorySlug || 'all'}/${p.slug}`,
        'name': p.name,
      })),
    },
  }

  return (
    <div className="pt-[70px] min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Page Header */}
      <div className="bg-cream border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Link href="/" className="hover:text-gold transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-gold transition-colors">Products</Link>
            {categorySlug && currentCategory && (
              <>
                <span>/</span>
                <span className="text-[#1a1a1a]">{currentCategory.name}</span>
              </>
            )}
          </nav>

          <h1 className="font-display text-4xl font-semibold text-[#1a1a1a]">{pageTitle}</h1>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            <Link href="/products"
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                !categorySlug
                  ? 'bg-gold text-white border-gold'
                  : 'border-gray-300 text-gray-600 hover:border-gold hover:text-gold'
              }`}>
              All
            </Link>
            {categories.map((cat) => (
              <Link key={cat.id || cat.slug} href={`/products/${cat.slug}`}
                className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  cat.slug === categorySlug
                    ? 'bg-gold text-white border-gold'
                    : 'border-gray-300 text-gray-600 hover:border-gold hover:text-gold'
                }`}>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
          <SortSelect defaultValue={sort} />
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id || product.slug} product={product} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <svg className="w-16 h-16 mx-auto mb-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-display text-2xl text-gray-400 mb-2">No products found</h3>
            <p className="text-gray-400 text-sm mb-6">
              {categorySlug ? 'There are no products in this category yet.' : 'No products are available at the moment.'}
            </p>
            <Link href="/products"
              className="inline-block border border-gold text-gold px-6 py-2 text-sm rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all duration-300">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
