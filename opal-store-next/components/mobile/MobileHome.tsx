import Link from 'next/link'
import { getImageUrl } from '@/lib/image'
import type { Product, SiteSettings } from '@/lib/types'
import MobileHeroCarousel, { type HeroSlide } from './MobileHeroCarousel'
import MobileFeaturedCarousel from './MobileFeaturedCarousel'
import MobileBannerCarousel from './MobileBannerCarousel'

interface Props {
  settings: SiteSettings
  products: Product[]
}

export default function MobileHome({ settings, products }: Props) {
  const primaryImg = settings.hero_image
    ? getImageUrl(settings.hero_image) || '/hero-mobile.jpg'
    : '/hero-mobile.jpg'

  const slides: HeroSlide[] = [
    {
      image: primaryImg,
      alt: 'Opal Perfume — Luxury fragrance collection',
      headline: settings.hero_headline || 'The art of Arabian perfumery.',
      subtext: settings.hero_subtext
        || 'Every bottle a story. Every scent a signature. Explore our curated collection of luxury fragrances.',
      ctaLabel: settings.cta_message || 'Shop the Collection',
      ctaHref: '/products',
    },
    {
      image: '/hero-mobile-2.jpg',
      alt: 'Opal Perfume — Luxury Fragrance Collection',
      headline: 'Crafted for the connoisseur.',
      subtext: 'From EPIC MAN to Nice Girl — nine signature scents, one uncompromising standard of luxury.',
      ctaLabel: 'Explore the Range',
      ctaHref: '/products',
    },
  ]

  // Curated banners shown between the product carousel and the Our Story block.
  // Add more entries here to grow the carousel; each becomes a swipeable slide.
  const banners = [
    { src: '/banner-1.jpg', alt: 'Iluminati RED — Eau de Parfum', href: '/products' },
  ]

  return (
    <div className="pt-[64px]">
      <MobileHeroCarousel slides={slides} />

      {/* Featured products */}
      <MobileFeaturedCarousel products={products} />

      {/* Banner */}
      <MobileBannerCarousel banners={banners} />

      {/* CTA strip */}
      <section className="bg-cream py-10 px-6 text-center">
        <h2 className="font-display text-2xl font-semibold text-ink mb-3">
          {settings.brand_name || 'Opal Perfume'}
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-6">
          {settings.about_snippet ||
            'Born from a passion for the art of perfumery, we craft each fragrance as a unique expression of elegance.'}
        </p>
        <Link
          href="/about"
          className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold border-b border-gold pb-0.5"
        >
          Our Story
        </Link>
      </section>
    </div>
  )
}
