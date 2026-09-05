/**
 * Shared listing view rendered by both /products and /products/[category].
 * Server Component — fetches, emits JSON-LD, and hands the data to the
 * client-side CollectionView for toolbar / facets / grid / pagination.
 */

import { getProducts, getCategories, getSettings } from '@/lib/api'
import CollectionView from './CollectionView'

interface Props {
  categorySlug?: string
  sort?: string
  /** Free-text query from the search overlay (/products?q=…). */
  search?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function ProductsListingView({ categorySlug, sort = '', search }: Props) {
  const [products, categories, settings] = await Promise.all([
    getProducts({ category: categorySlug, sort, search }),
    getCategories(),
    getSettings(),
  ])

  const currentCategory = categories.find((c) => c.slug === categorySlug)
  const pageTitle = search
    ? 'Search'
    : categorySlug
    ? currentCategory?.name || categorySlug
    : 'All Products'
  const brandName = settings.brand_name || 'Opal Perfume'

  // ── JSON-LD CollectionPage + ItemList + BreadcrumbList ───────────────
  const seoUrl = categorySlug ? `/products/${categorySlug}` : '/products'

  const breadcrumbItems = [
    { '@type': 'ListItem', 'position': 1, 'name': 'Home',     'item': SITE_URL },
    { '@type': 'ListItem', 'position': 2, 'name': 'Products', 'item': `${SITE_URL}/products` },
  ]
  if (categorySlug && currentCategory) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 3,
      'name': currentCategory.name,
      'item': `${SITE_URL}/products/${currentCategory.slug}`,
    })
  }

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
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
      },
      { '@type': 'BreadcrumbList', 'itemListElement': breadcrumbItems },
    ],
  }

  return (
    <div className="pt-16 md:pt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Collection header — centred title in a narrow container, no banner
          image, matching the reference. */}
      <div className="section-spacing--tight">
        <div className="container-page container-page--xs text-center">
          <h1 className="h1">{pageTitle}</h1>
          {search ? (
            <p className="mt-4 text-sm text-muted">
              {products.length} {products.length === 1 ? 'result' : 'results'} for
              &ldquo;{search}&rdquo;
            </p>
          ) : (
            currentCategory?.description && (
              <p className="mt-4 text-sm text-muted">{currentCategory.description}</p>
            )
          )}
        </div>
      </div>

      <CollectionView
        products={products}
        categories={categories}
        categorySlug={categorySlug}
        sort={sort}
        brandName={brandName}
      />
    </div>
  )
}
