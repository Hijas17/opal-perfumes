import type { Metadata } from 'next'
import ProductsListingView from '@/components/ProductsListingView'

const TITLE = 'Shop All Perfumes & Buhoor — UAE'
const DESC  = 'Browse our full collection of luxury perfumes and buhoor in UAE. Authentic Arabian fragrances, oud and oriental scents crafted for elegance.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    'luxury perfumes UAE', 'best fragrances UAE', 'Arabian perfumes',
    'buy perfumes online UAE', 'oud perfumes', 'buhoor UAE',
  ],
  alternates: { canonical: '/products' },
  openGraph: { title: TITLE, description: DESC, url: '/products', type: 'website' },
}

interface PageProps {
  searchParams: Promise<{ sort?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { sort } = await searchParams
  return <ProductsListingView sort={sort} />
}
