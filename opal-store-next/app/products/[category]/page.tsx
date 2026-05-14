import type { Metadata } from 'next'
import ProductsListingView from '@/components/ProductsListingView'
import { getCategories } from '@/lib/api'

interface RouteParams {
  category: string
}

interface PageProps {
  params:       Promise<RouteParams>
  searchParams: Promise<{ sort?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: categorySlug } = await params
  const cats = await getCategories()
  const cat = cats.find((c) => c.slug === categorySlug)
  const catName = cat?.name || categorySlug
  const title = `${catName} — Luxury Fragrances UAE`
  const description = `Shop premium ${catName} in UAE. Opal Perfumes offers the finest luxury ${catName.toLowerCase()} — authentic Arabian scents, oud and oriental fragrances delivered across UAE.`
  return {
    title,
    description,
    keywords: [
      `${catName} UAE`, 'luxury perfumes UAE', 'best fragrances UAE',
      'Arabian perfumes', 'buy perfumes online UAE',
    ],
    alternates: { canonical: `/products/${categorySlug}` },
    openGraph: { title, description, url: `/products/${categorySlug}`, type: 'website' },
  }
}

export default async function CategoryProductsPage({ params, searchParams }: PageProps) {
  const { category: categorySlug } = await params
  const { sort } = await searchParams
  return <ProductsListingView categorySlug={categorySlug} sort={sort} />
}
