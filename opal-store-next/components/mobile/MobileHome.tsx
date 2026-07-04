import Link from 'next/link'
import { getImageUrl } from '@/lib/image'
import type { Product, SiteSettings } from '@/lib/types'
import MobileFeaturedCarousel from './MobileFeaturedCarousel'
import MobileBannerCarousel from './MobileBannerCarousel'

interface Props {
  settings: SiteSettings
  products: Product[]
}

export default function MobileHome({ settings, products }: Props) {
  const heroImg = settings.hero_image
    ? getImageUrl(settings.hero_image)
    : '/hero-mobile.jpg'
  const headline = settings.hero_headline || 'The art of Arabian perfumery.'
  const subtext = settings.hero_subtext
    || 'Every bottle a story. Every scent a signature. Explore our curated collection of luxury fragrances.'
  const ctaLabel = settings.cta_message || 'Shop the Collection'

  const bannerImg = settings.about_hero_image ? getImageUrl(settings.about_hero_image) : null

  return (
    <div className="pt-[64px] bg-white">
      {/* Hero — bg image loads via CSS so a missing file falls back cleanly to the gradient. */}
      <section className="relative">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden bg-[#2b0f45] bg-cover bg-center"
          style={heroImg ? { backgroundImage: `url("${heroImg}")` } : undefined}
          role="img"
          aria-label="Opal Perfume — Luxury fragrance collection"
        >
          {/* Dark tint layer — adds depth so text pops against the bottles image. */}
          <div className="absolute inset-0 bg-gray-900/40" />
          {/* Extra bottom fade — guarantees CTA contrast even on lighter image regions. */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10 text-center">
            <h1 className="font-display italic text-3xl leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] max-w-xs">
              {headline}
            </h1>
            <p className="mt-4 text-sm text-white/90 leading-relaxed max-w-xs drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
              {subtext}
            </p>
            <Link
              href="/products"
              className="mt-6 inline-block bg-white text-[#1a1a1a] px-8 py-3.5 text-xs font-semibold tracking-[0.2em] uppercase shadow-lg hover:bg-white/90 transition-colors"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <MobileFeaturedCarousel products={products} />

      {/* Banner */}
      {bannerImg && (
        <MobileBannerCarousel
          banners={[{ src: bannerImg, alt: settings.brand_name || 'Featured banner', href: '/products' }]}
        />
      )}

      {/* CTA strip */}
      <section className="bg-cream py-10 px-6 text-center">
        <h2 className="font-display text-2xl font-semibold text-[#1a1a1a] mb-3">
          {settings.brand_name || 'Opal Perfumes'}
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
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
