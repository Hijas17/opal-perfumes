import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SearchProvider from '@/components/SearchProvider'
import AuthProvider from '@/components/AuthProvider'
import CartProvider from '@/components/CartProvider'
import Preloader from '@/components/Preloader'
import { getCategories } from '@/lib/api'

// ─── Fonts (zero-CLS via next/font) ───────────────────────────────────────
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

// ─── Site-wide metadata ────────────────────────────────────────────────────
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  'Opal Perfumes — Luxury Arabian Fragrances in UAE',
    template: '%s | Opal Perfumes',
  },
  description:
    'Discover premium luxury perfumes, buhoor and Arabian fragrances in UAE. Opal Perfumes crafts exquisite oriental scents, oud and French perfumes for men and women.',
  keywords: [
    'perfumes UAE', 'best perfumes UAE', 'luxury fragrances UAE', 'Arabian perfumes UAE',
    'best fragrances in UAE', 'oud perfumes Dubai', 'buhoor UAE', 'oriental fragrances',
    'Arabic perfumes online', 'luxury scents Dubai',
  ],
  authors: [{ name: 'Opal Perfumes' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Opal Perfumes',
    locale: 'en_AE',
    title: 'Opal Perfumes — Luxury Arabian Fragrances in UAE',
    description: 'Discover premium luxury perfumes, buhoor and Arabian fragrances in UAE.',
    images: ['/og-cover.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opal Perfumes — Luxury Arabian Fragrances in UAE',
    description: 'Discover premium luxury perfumes, buhoor and Arabian fragrances in UAE.',
    images: ['/og-cover.jpg'],
  },
  other: {
    'geo.region':    'AE',
    'geo.placename': 'Dubai, UAE',
    'geo.position':  '25.2048;55.2708',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

// ─── Site-wide JSON-LD (Organization + WebSite) ───────────────────────────
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      'name': 'Opal Perfumes',
      'url':  SITE_URL,
      'logo': `${SITE_URL}/logo.png`,
      'description': 'Luxury Arabian perfumes, buhoor and oriental fragrances crafted for elegance. Based in UAE.',
      'address': { '@type': 'PostalAddress', 'addressCountry': 'AE', 'addressRegion': 'Dubai' },
      'sameAs': [
        'https://instagram.com/opalperfumes',
        'https://facebook.com/opalperfumes',
        'https://youtube.com/@opalperfumes',
      ],
    },
    {
      '@type': 'WebSite',
      'name': 'Opal Perfumes',
      'url':  SITE_URL,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': { '@type': 'EntryPoint', 'urlTemplate': `${SITE_URL}/products?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Categories are needed by Navbar (client) — fetch once, server-side, pass as prop
  const categories = await getCategories()

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-[#1a1a1a]">
        <Preloader />
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <Navbar categories={categories} />
              <main className="flex-1">{children}</main>
              <Footer />
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
