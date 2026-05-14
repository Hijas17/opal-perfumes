import Link from 'next/link'
import Image from 'next/image'
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

export default async function AboutPage() {
  const s = await getSettings()
  const heroImageUrl    = s.about_hero_image ? getImageUrl(s.about_hero_image) : null
  const founderPhotoUrl = s.founder_photo    ? getImageUrl(s.founder_photo)    : null

  // ── About JSON-LD ────────────────────────────────────────────────────
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'name': 'About Opal Perfumes',
    'url':  `${SITE_URL}/about`,
    'description': 'The story and heritage behind Opal Perfumes, a luxury Arabian fragrance brand in UAE.',
    'mainEntity': {
      '@type': 'Organization',
      'name': 'Opal Perfumes',
      'foundingLocation': { '@type': 'Place', 'name': 'UAE' },
      'description': s.brand_story?.replace(/<[^>]+>/g, '') || '',
    },
  }

  return (
    <div className="pt-[70px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Hero */}
      <section
        className="relative flex items-center justify-center h-[50vh] min-h-[320px] bg-cover bg-center bg-no-repeat"
        style={
          heroImageUrl
            ? { backgroundImage: `url(${heroImageUrl})` }
            : { background: 'linear-gradient(135deg, #1a1a1a 0%, #3a2a0a 50%, #a67b30 100%)' }
        }
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 text-center px-4">
          <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">Our Heritage</p>
          <h1 className="font-display text-5xl sm:text-6xl font-semibold text-white">About Us</h1>
        </div>
      </section>

      {/* Brand Story */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">Who We Are</p>
            <h2 className="font-display text-4xl font-semibold text-[#1a1a1a]">{s.brand_name || 'Opal Perfumes'}</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mt-4" />
          </div>

          {s.brand_story ? (
            <div className="rich-text text-gray-600 leading-relaxed text-lg"
                 dangerouslySetInnerHTML={{ __html: s.brand_story }} />
          ) : (
            <p className="text-gray-600 leading-relaxed text-lg text-center">
              Born from a passion for the art of perfumery, we craft each fragrance as a unique expression of elegance and identity. Our perfumes are more than scents — they are stories waiting to be told, memories waiting to be made.
            </p>
          )}
        </div>
      </section>

      {/* Mission Statement */}
      {s.mission_statement && (
        <section className="bg-gold py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <svg className="w-10 h-10 text-white/40 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="font-display text-2xl sm:text-3xl font-medium text-white leading-relaxed">{s.mission_statement}</p>
          </div>
        </section>
      )}

      {/* Founder Section */}
      {(founderPhotoUrl || s.founder_bio) && (
        <section className="bg-cream py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">The Visionary</p>
              <h2 className="font-display text-4xl font-semibold text-[#1a1a1a]">Our Founder</h2>
              <div className="w-16 h-0.5 bg-gold mx-auto mt-4" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10">
              {founderPhotoUrl && (
                <div className="flex-shrink-0">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gold/30 shadow-lg relative">
                    <Image src={founderPhotoUrl} alt="Founder" fill sizes="192px" className="object-cover" />
                  </div>
                </div>
              )}
              {s.founder_bio && (
                <div className="rich-text text-gray-600 leading-relaxed text-base"
                     dangerouslySetInnerHTML={{ __html: s.founder_bio }} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Values Strip */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">What Drives Us</p>
            <h2 className="font-display text-4xl font-semibold text-[#1a1a1a]">Our Values</h2>
            <div className="w-16 h-0.5 bg-gold mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Craftsmanship',
                text:  'Every bottle is a labour of love, crafted with the finest ingredients and meticulous attention to detail.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
              },
              {
                title: 'Luxury',
                text:  'We believe luxury is not a price — it is an experience, a feeling that lingers long after the last note fades.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: 'Heritage',
                text:  'Rooted in the rich traditions of Arabian perfumery, we honour the past while embracing the future.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                ),
              },
            ].map(({ title, icon, text }) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center text-gold mx-auto mb-4">
                  {icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-[#1a1a1a] mb-3">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1a1a1a] py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Experience the Collection</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">Discover fragrances crafted to tell your story.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products" className="inline-block bg-gold text-white px-10 py-3.5 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors duration-300">
              Shop Now
            </Link>
            <Link href="/contact" className="inline-block border border-gold text-gold px-10 py-3.5 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all duration-300">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
