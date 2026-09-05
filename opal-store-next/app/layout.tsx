import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SearchProvider from '@/components/SearchProvider'
import AuthProvider from '@/components/AuthProvider'
import CartProvider from '@/components/CartProvider'
import Preloader from '@/components/Preloader'
import AnnouncementBar from '@/components/AnnouncementBar'
import CartDrawerProvider from '@/components/CartDrawerProvider'
import CurrencyProvider from '@/components/CurrencyProvider'
import MobileShell from '@/components/mobile/MobileShell'
import WhatsAppFloat from '@/components/mobile/WhatsAppFloat'
import { getCategories, getSettings } from '@/lib/api'

// ─── Brand fonts (self-hosted so builds never depend on Google's CDN) ──────
// Per the Opal brand guide:
//   Cinzel Regular      — logo wordmark and HEADINGS (all caps, wide tracking)
//   Montserrat Light/Reg — subheadings, body copy, taglines and small details
// This intentionally departs from the reference storefront, which uses a single
// sans throughout; the brand guide takes precedence over matching it.
const cinzel = localFont({
  src: './fonts/cinzel.woff2',
  variable: '--font-cinzel',
  display: 'swap',
  weight: '400 600',
})

const montserrat = localFont({
  src: './fonts/montserrat.woff2',
  variable: '--font-montserrat',
  display: 'swap',
  weight: '300 600',
})

// ─── Site-wide metadata ────────────────────────────────────────────────────
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  'Opal Perfume — The Art of Arabian Perfumery in UAE',
    template: '%s | Opal Perfume',
  },
  description:
    'Opal Perfume — a curated collection of luxury Arabian fragrances, oud and buhoor handcrafted in the UAE. Every bottle a story, every scent a signature.',
  keywords: [
    'Opal Perfume', 'Opal Perfume UAE', 'Arabian perfumes UAE', 'luxury fragrances UAE',
    'oud perfumes Dubai', 'best perfumes UAE', 'buhoor UAE', 'oriental fragrances',
    'Arabic perfumes online', 'luxury scents Dubai', 'niche perfumes UAE',
    'Emirati luxury perfumes',
  ],
  authors: [{ name: 'Opal Perfume' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Opal Perfume',
    locale: 'en_AE',
    title: 'Opal Perfume — The Art of Arabian Perfumery in UAE',
    description: 'A curated collection of luxury Arabian fragrances, oud and buhoor. Every bottle a story, every scent a signature.',
    images: ['/og-cover.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opal Perfume — The Art of Arabian Perfumery in UAE',
    description: 'A curated collection of luxury Arabian fragrances, oud and buhoor. Every bottle a story, every scent a signature.',
    images: ['/og-cover.jpg'],
  },
  verification: {
    // Set NEXT_PUBLIC_GOOGLE_VERIFICATION in .env.production to the token
    // from Google Search Console (the value in the meta-tag verification method).
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
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
  themeColor: '#000000',
}

// ─── Site-wide JSON-LD (Organization + WebSite) ───────────────────────────
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      'name': 'Opal Perfume',
      'url':  SITE_URL,
      'logo': `${SITE_URL}/logo.png`,
      'description': 'A curated collection of luxury Arabian fragrances, oud and buhoor handcrafted in the UAE. The art of Arabian perfumery.',
      'address': { '@type': 'PostalAddress', 'addressCountry': 'AE', 'addressRegion': 'Dubai' },
      'sameAs': [
        'https://instagram.com/opalperfumes',
        'https://facebook.com/opalperfumes',
        'https://youtube.com/@opalperfumes',
      ],
    },
    {
      '@type': 'WebSite',
      'name': 'Opal Perfume',
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
  // Categories feed the Navbar, MobileShell and Footer.
  const [categories, settings] = await Promise.all([
    getCategories(),
    getSettings(),
  ])

  const fontVars = `${cinzel.variable} ${montserrat.variable}`

  return (
    <html lang="en" data-scroll-behavior="smooth" className={fontVars}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg text-ink">
        {/* Context providers stay mounted in both modes — they render no product
            UI on their own, and gated pages (e.g. /cart) still need them to
            prerender at build time (the proxy only redirects at runtime). */}
        <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <SearchProvider>
              <CartDrawerProvider whatsappNumber={settings.whatsapp_number}>
                <Preloader brandName={settings.brand_name || 'Opal'} />
                <div className="hidden md:block">
                  <AnnouncementBar />
                  <Navbar categories={categories} />
                </div>
                <MobileShell categories={categories} settings={settings} />
                <main className="flex-1">{children}</main>
                <Footer />
                <WhatsAppFloat whatsappNumber={settings.whatsapp_number} />
              </CartDrawerProvider>
            </SearchProvider>
          </CartProvider>
        </AuthProvider>
        </CurrencyProvider>
      </body>
    </html>
  )
}
