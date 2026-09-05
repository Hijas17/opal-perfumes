import Link from 'next/link'
import type { Metadata } from 'next'

import { getSettings } from '@/lib/api'
import { getImageUrl } from '@/lib/image'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const description = s.brand_story
    ? s.brand_story.replace(/<[^>]+>/g, '').slice(0, 155)
    : 'Learn the story behind Opal Perfumes — a UAE luxury fragrance house dedicated to crafting exceptional Arabian perfumes, buhoor and oriental scents.'

  return {
    title: 'About Us — Our Story & Heritage',
    description,
    keywords: [
      'about Opal Perfumes', 'luxury perfume brand UAE',
      'Arabian fragrance house', 'perfume brand story Dubai', 'oriental fragrance heritage',
    ],
    alternates: { canonical: '/about' },
    openGraph: { title: 'About Us — Our Story & Heritage', description, url: '/about', type: 'website' },
  }
}

/** The reference's About page: a content-over-media hero, an image-with-text
 *  block, a services multi-column row, then a closing CTA. */
export default async function AboutPage() {
  const s = await getSettings()
  const brand = s.brand_name || 'Opal Perfume'
  const heroImageUrl = s.about_hero_image ? getImageUrl(s.about_hero_image) : null
  const founderPhotoUrl = s.founder_photo ? getImageUrl(s.founder_photo) : null

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'name': `About ${brand}`,
    'url': `${SITE_URL}/about`,
    'description': 'The story and heritage behind Opal Perfumes, a luxury Arabian fragrance brand in UAE.',
    'mainEntity': {
      '@type': 'Organization',
      'name': brand,
      'foundingLocation': { '@type': 'Place', 'name': 'UAE' },
      'description': s.brand_story?.replace(/<[^>]+>/g, '') || '',
    },
  }

  const services = [
    { title: 'Private Labelling', body: 'Your brand, our perfumers — from concept brief to finished bottle.' },
    { title: 'Bespoke Blending',  body: 'A fragrance composed around one person, one memory, one occasion.' },
    { title: 'Workshops',         body: 'Learn the craft of Arabian perfumery with our in-house noses.' },
  ]

  return (
    <div className="pt-16 md:pt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Content over media ─────────────────────────────────────────── */}
      <section className="relative grid min-h-[60vh] place-items-center overflow-hidden bg-black">
        {heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/60" aria-hidden />
        <div className="relative flex flex-col items-center gap-4 px-6 py-24 text-center">
          <p className="eyebrow">Our heritage</p>
          <h1 className="h1">About Us</h1>
        </div>
      </section>

      {/* ── Image with text — full-bleed 50/50, zero gap ───────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative aspect-[4/3] bg-surface md:aspect-auto md:min-h-[520px]">
          {founderPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={founderPhotoUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-4 px-6 py-16 md:px-12">
          <p className="eyebrow">Our story</p>
          <h2 className="h2">{brand}</h2>
          {s.brand_story ? (
            <div className="rich-text max-w-prose" dangerouslySetInnerHTML={{ __html: s.brand_story }} />
          ) : (
            <p className="prose max-w-prose">
              Born from a passion for the art of perfumery, we craft each fragrance
              as a unique expression of elegance and identity. Our perfumes are more
              than scents — they are stories waiting to be told.
            </p>
          )}
          {s.founder_bio && (
            <div className="rich-text mt-2 max-w-prose" dangerouslySetInnerHTML={{ __html: s.founder_bio }} />
          )}
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────── */}
      {s.mission_statement && (
        <section className="section-spacing bg-surface-2">
          <div className="container-page container-page--xs text-center">
            <p className="eyebrow">Our mission</p>
            <p className="mt-4 text-lg leading-relaxed text-gold">{s.mission_statement}</p>
          </div>
        </section>
      )}

      {/* ── Services multi-column ─────────────────────────────────────── */}
      <section className="section-spacing bg-surface">
        <div className="container-page">
          <div className="mb-12 text-center">
            <p className="eyebrow">What we do</p>
            <h2 className="h2 mt-2">Our Services</h2>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {services.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 border border-line p-8 text-center">
                <h3 className="h5">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <section className="section-spacing">
        <div className="container-page container-page--xs text-center">
          <h2 className="h2">{s.cta_message || 'Find your signature scent'}</h2>
          <p className="mt-4 text-sm text-muted">
            Our fragrance experts are ready to help you choose.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/products" className="btn">Shop the collection</Link>
            <Link href="/contact" className="btn btn--outline">Contact us</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
