import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSettings } from '@/lib/api'
import ContactForm from '@/components/ContactForm'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'Contact Us — Get in Touch',
  description: 'Contact Opal Perfumes for inquiries about our luxury Arabian perfumes, buhoor and fragrances. We\'re based in UAE and happy to help you find your perfect scent.',
  keywords: [
    'contact Opal Perfumes', 'perfume inquiry UAE', 'buy perfumes Dubai',
    'fragrance consultation UAE', 'Arabian perfume shop contact',
  ],
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us — Get in Touch',
    description: 'Contact Opal Perfumes for inquiries about our luxury Arabian perfumes.',
    url: '/contact',
    type: 'website',
  },
}

export default async function ContactPage() {
  const s = await getSettings()

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    'name': 'Contact Opal Perfumes',
    'url': `${SITE_URL}/contact`,
    'description': 'Reach out to Opal Perfumes for fragrance inquiries and consultations.',
    'mainEntity': {
      '@type': 'Organization',
      'name': 'Opal Perfumes',
      'email': s.contact_email || 'hello@opalperfumes.com',
      'telephone': s.contact_phone || '',
      'address': { '@type': 'PostalAddress', 'addressCountry': 'AE', 'streetAddress': s.address || '' },
    },
  }

  return (
    <div className="pt-[70px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Hero */}
      <section className="bg-[#1a1a1a] py-16 px-4 text-center">
        <p className="text-gold text-xs tracking-[0.3em] uppercase font-medium mb-3">Get in Touch</p>
        <h1 className="font-display text-5xl sm:text-6xl font-semibold text-white">Contact Us</h1>
      </section>

      <section className="bg-cream py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact Info — server-rendered from settings */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#1a1a1a] mb-4">
                We&rsquo;d love to hear from you
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Whether you have a question about our fragrances, need help finding the perfect scent, or simply want to learn more about our brand — we&rsquo;re here to help.
              </p>
            </div>

            <div className="space-y-5">
              {s.contact_email && (
                <ContactInfoItem
                  label="Email"
                  value={s.contact_email}
                  href={`mailto:${s.contact_email}`}
                  icon={<svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                />
              )}
              {s.contact_phone && (
                <ContactInfoItem
                  label="Phone"
                  value={s.contact_phone}
                  href={`tel:${s.contact_phone}`}
                  icon={<svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                />
              )}
              {s.address && (
                <ContactInfoItem
                  label="Address"
                  value={s.address}
                  icon={<svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
              )}
              {s.whatsapp_number && (
                <ContactInfoItem
                  label="WhatsApp"
                  value={s.whatsapp_number}
                  href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`}
                  external
                  icon={<svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>}
                />
              )}
            </div>
          </div>

          {/* Form (client) — wrapped in Suspense because useSearchParams requires it */}
          <div className="lg:col-span-3 bg-white rounded-[var(--radius-card)] p-8 shadow-[var(--shadow-card)]">
            <Suspense fallback={<div className="text-sm text-gray-400">Loading form…</div>}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}

interface ContactInfoItemProps {
  label: string
  value: string
  href?: string
  external?: boolean
  icon: React.ReactNode
}

function ContactInfoItem({ label, value, href, external, icon }: ContactInfoItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        {href ? (
          <a href={href}
             target={external ? '_blank' : undefined}
             rel={external ? 'noopener noreferrer' : undefined}
             className="text-[#1a1a1a] hover:text-gold transition-colors duration-200 font-medium">
            {value}
          </a>
        ) : (
          <p className="text-[#1a1a1a] font-medium whitespace-pre-line">{value}</p>
        )}
      </div>
    </div>
  )
}
