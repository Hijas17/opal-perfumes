import Link from 'next/link'
import type { Metadata } from 'next'

import { getSettings, getProducts, getCategories } from '@/lib/api'
import { getImageUrl } from '@/lib/image'
import ProductCard from '@/components/ProductCard'
import HeroSlideshow, { type HeroSlide } from '@/components/HeroSlideshow'
import FeaturedCarousel from '@/components/FeaturedCarousel'
import BeforeAfter, { type BeforeAfterItem } from '@/components/BeforeAfter'
import MobileHome from '@/components/mobile/MobileHome'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const brand = s.brand_name || 'Opal Perfume'
  const description =
    s.hero_subtext ||
    `${brand} — a curated collection of luxury Arabian fragrances, oud and buhoor handcrafted in the UAE. Every bottle a story, every scent a signature.`

  return {
    description,
    keywords: [
      'Opal Perfume', 'Opal Perfume UAE', 'Arabian perfumes UAE', 'luxury fragrances UAE',
      'oud perfumes Dubai', 'best perfumes UAE', 'buhoor UAE',
      'oriental fragrances', 'Arabic perfumes online', 'luxury perfumes Dubai',
      'niche perfumes UAE', 'Emirati luxury perfumes',
    ],
    alternates: { canonical: '/' },
    openGraph: {
      url: SITE_URL,
      type: 'website',
      title: `${brand} — The Art of Arabian Perfumery in UAE`,
      description,
    },
  }
}

export default async function HomePage() {
  const [s, featured, categories] = await Promise.all([
    getSettings(),
    getProducts({ featured: true }),
    getCategories(),
  ])

  const brandName = s.brand_name || 'Opal Perfume'
  const products = featured.slice(0, 8)


  // ── Hero slides ────────────────────────────────────────────────────────
  // Admin-managed via Settings › Home Media. Falls back to the legacy single
  // hero_* fields so the page still renders before any slides are configured.
  const adminSlides = Array.isArray(s.home_hero_slides) ? s.home_hero_slides : []
  const slides: HeroSlide[] = adminSlides
    .filter((slide) => slide?.image)
    .map((slide) => ({
      image: getImageUrl(slide.image!) ?? '',
      eyebrow: slide.eyebrow || undefined,
      headline: (slide.headline || '').replace(/\n/g, ' '),
      subtext: slide.subtext || undefined,
      ctaLabel: slide.cta_label || 'Explore',
      ctaHref: slide.cta_href || '/products',
    }))
    .filter((slide) => slide.image)

  if (slides.length === 0) {
    const heroImage = s.hero_image ? getImageUrl(s.hero_image) : null
    slides.push({
      image: heroImage || '/banner-1.jpg',
      eyebrow: s.hero_tagline || 'Luxury Fragrances',
      headline: (s.hero_headline || 'Discover your scent').replace(/\n/g, ' '),
      subtext: s.hero_subtext || undefined,
      ctaLabel: 'Explore',
      ctaHref: '/products',
    })
  }

  // ── "Scented Delights" tiles ───────────────────────────────────────────
  // Admin tiles win; otherwise fall back to the first three categories.
  const adminTiles = Array.isArray(s.home_delight_tiles) ? s.home_delight_tiles : []
  const delightTiles = adminTiles.length
    ? adminTiles.map((t) => ({
        title: t.title || '',
        href: t.href || '/products',
        image: t.image ? getImageUrl(t.image) : null,
      }))
    : categories.slice(0, 3).map((c) => ({
        title: c.name,
        href: `/products/${c.slug}`,
        image: c.image ? getImageUrl(c.image) : null,
      }))

  // ── Before / after comparator ──────────────────────────────────────────
  // Both halves must have an image or the section is hidden entirely.
  const compare = s.home_compare
  const comparePair: BeforeAfterItem[] = (['before', 'after'] as const)
    .map((side) => {
      const cfg = compare?.[side]
      if (!cfg?.image) return null
      const image = getImageUrl(cfg.image)
      if (!image) return null
      return {
        image,
        label: cfg.label || '',
        href: cfg.href || '/products',
        ctaLabel: 'Buy now',
      }
    })
    .filter(Boolean) as BeforeAfterItem[]

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/#org`,
        'name': brandName,
        'image': `${SITE_URL}/og-cover.jpg`,
        'description': 'A curated collection of luxury Arabian fragrances, oud and buhoor handcrafted in the UAE.',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Mobile home (below md) — its own tree, restyled in a later phase ── */}
      <div className="md:hidden">
        <MobileHome settings={s} products={products} />
      </div>

      {/* ── Desktop (md+) ─────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <HeroSlideshow slides={slides} />

        {/* Featured strip on a raised surface, bleeding off both edges */}
        {products.length > 0 && (
          <section className="section-spacing border-y border-line bg-surface-2">
            <div className="container-page mb-10 text-center">
              <p className="eyebrow">Weekly pick</p>
              <h2 className="h2 mt-2">Featured Collection</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
                Discover this week&rsquo;s curated fragrances and find your next signature scent.
              </p>
            </div>
            <FeaturedCarousel products={products} vendor={brandName} />
          </section>
        )}

        {/* Category tiles */}
        {categories.length > 0 && (
          <section className="section-spacing bg-surface">
            <div className="container-page">
              <div className="mb-10 text-center">
                <h2 className="h2">Our Collections</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.slice(0, 6).map((cat) => {
                  const tileImage = cat.image ? getImageUrl(cat.image) : null
                  return (
                    <Link
                      key={cat.id || cat.slug}
                      href={`/products/${cat.slug}`}
                      className="group relative grid aspect-[4/3] place-items-center overflow-hidden border border-line bg-black"
                    >
                      {tileImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tileImage}
                          alt=""
                          aria-hidden
                          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-80"
                        />
                      )}
                      <span className="relative h4 text-gold transition-colors group-hover:text-ink">
                        {cat.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Featured grid + Explore */}
        {products.length > 0 && (
          <section className="section-spacing">
            <div className="container-page">
              <div className="mb-10 text-center">
                <p className="eyebrow">Curated for you</p>
                <h2 className="h2 mt-2">Bestsellers</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-16 lg:grid-cols-4">
                {products.slice(0, 4).map((p) => (
                  <ProductCard key={p.id || p.slug} product={p} vendor={brandName} />
                ))}
              </div>
              <div className="mt-12 text-center">
                <Link href="/products" className="btn btn--outline">Explore</Link>
              </div>
            </div>
          </section>
        )}

        {/* Multi-column — "Scented Delights" */}
        {delightTiles.length > 0 && (
        <section className="section-spacing bg-surface">
          <div className="container-page text-center">
            <h2 className="h2">Scented Delights</h2>
            <p className="eyebrow mt-3">A trio of luxurious fragrances</p>

            <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
              {delightTiles.map((col) => (
                <Link key={col.title} href={col.href} className="group flex flex-col gap-4">
                  <div className="relative aspect-square w-full overflow-hidden border border-line bg-black">
                    {col.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={col.image}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <span className="h5 text-gold transition-colors group-hover:text-ink">
                    {col.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Before / after comparator */}
        {comparePair.length === 2 && (
          <section className="section-spacing">
            <div className="container-page">
              <BeforeAfter before={comparePair[0]} after={comparePair[1]} />
            </div>
          </section>
        )}

        {/* About snippet */}
        <section className="section-spacing">
          <div className="container-page container-page--xs text-center">
            <p className="eyebrow">Our heritage</p>
            <h2 className="h2 mt-2">{brandName}</h2>
            <p className="mt-6 text-sm leading-relaxed text-ink">
              {s.about_snippet ||
                'Born from a passion for the art of perfumery, we craft each fragrance as a unique expression of elegance and identity.'}
            </p>
            <div className="mt-8">
              <Link href="/about" className="btn btn--outline">Our Story</Link>
            </div>
          </div>
        </section>

        {/* Trust row */}
        <section className="border-t border-line py-12">
          <div className="container-page grid grid-cols-1 gap-10 text-center md:grid-cols-3">
            {[
              { t: 'International Shipping', d: 'Worldwide shipping — customs and duties excluded.' },
              { t: 'Customer Service',       d: 'Get in touch with us on WhatsApp.' },
              { t: 'Secure Payment',         d: 'Your payment information is processed securely.' },
            ].map((item) => (
              <div key={item.t} className="flex flex-col gap-2">
                <h3 className="h6">{item.t}</h3>
                <p className="text-sm text-muted">{item.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
