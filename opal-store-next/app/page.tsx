import Link from 'next/link'
import type { Metadata } from 'next'
import { getSettings, getProducts } from '@/lib/api'
import ProductCard from '@/components/ProductCard'
import HeroExperience from '@/components/HeroExperience'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const description =
    `${s.brand_name || 'Opal Perfumes'} — ${s.hero_subtext || 'Handcrafted luxury perfumes and buhoor in UAE. Discover the finest Arabian fragrances, oud and oriental scents crafted for elegance.'}`

  return {
    description,
    keywords: [
      'best perfumes UAE', 'luxury fragrances UAE', 'Arabian perfumes UAE',
      'best fragrances in UAE', 'oud perfumes Dubai', 'buhoor UAE',
      'oriental fragrances', 'Arabic perfumes online', 'luxury perfumes Dubai',
      'top perfume brands UAE',
    ],
    alternates: { canonical: '/' },
    openGraph: {
      url: SITE_URL,
      type: 'website',
      title: 'Opal Perfumes — Luxury Arabian Fragrances in UAE',
      description,
    },
  }
}

export default async function HomePage() {
  // Both fetches happen in parallel on the server
  const [s, allFeatured] = await Promise.all([
    getSettings(),
    getProducts({ featured: true }),
  ])

  const products = allFeatured.slice(0, 8)

  // ─── Page-specific JSON-LD ─────────────────────────────────────────────
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/#org`,
        'name': s.brand_name || 'Opal Perfumes',
        'image': `${SITE_URL}/og-cover.jpg`,
        'description': 'Luxury Arabian perfumes, buhoor and oriental fragrances in UAE.',
        'url': SITE_URL,
        'address': { '@type': 'PostalAddress', 'addressCountry': 'AE', 'addressRegion': 'Dubai' },
        'priceRange': '$$–$$$',
        'sameAs': [s.instagram_url, s.facebook_url, s.youtube_url].filter(Boolean),
      },
      {
        '@type': 'ItemList',
        'name': 'Featured Perfumes',
        'url': `${SITE_URL}/products`,
        'numberOfItems': products.length,
        'itemListElement': products.slice(0, 6).map((p, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'url': `${SITE_URL}/products/${p.subcategory_slug || 'all'}/${p.slug}`,
          'name': p.name,
        })),
      },
    ],
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Hero (Apple-style scroll experience) ────────────────────────── */}
      <HeroExperience
        heroTagline={s.hero_tagline || 'Luxury Fragrances'}
        heroHeadline={s.hero_headline || 'Discover\nyour scent.'}
        heroSubtext={s.hero_subtext || 'Handcrafted luxury perfumes that tell your story. Each bottle a masterpiece.'}
        brandName={s.brand_name || 'Opal Perfumes'}
      />

      {/* ── Featured Products ───────────────────────────────────────────── */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">Curated For You</p>
            <h2 className="font-display text-4xl font-semibold text-[#1a1a1a]">Featured Collection</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mt-4" />
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="font-display text-lg">No featured products yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, i) => (
                <ProductCard key={product.id || product.slug} product={product} priority={i < 4} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/products"
              className="inline-block border-2 border-gold text-gold px-10 py-3 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all duration-300">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* ── About Snippet ───────────────────────────────────────────────── */}
      <section className="bg-[#fce7de] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-4">Our Heritage</p>
          <h2 className="font-display text-4xl font-semibold text-[#1a1a1a] mb-6">{s.brand_name || 'Opal Perfumes'}</h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            {s.about_snippet || 'Born from a passion for the art of perfumery, we craft each fragrance as a unique expression of elegance and identity. Our perfumes are more than scents — they are stories waiting to be told.'}
          </p>
          <Link href="/about" className="inline-flex items-center gap-2 text-gold font-medium text-sm tracking-wider uppercase hover:gap-3 transition-all duration-300">
            Our Story
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── CTA Strip ───────────────────────────────────────────────────── */}
      <section className="bg-[#df9e82] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white mb-4">
            {s.cta_message || 'Find Your Perfect Fragrance'}
          </h2>
          <p className="text-white/80 mb-8 text-base leading-relaxed">
            Our fragrance experts are ready to help you discover your signature scent.
          </p>
          <Link href="/contact" className="inline-block bg-white text-gold px-10 py-4 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gray-100 transition-colors duration-300">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}
