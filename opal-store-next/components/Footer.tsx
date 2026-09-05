/**
 * Footer — four equal columns, newsletter, centred social row and a copyright
 * bar, following the reference storefront's structure.
 *
 * Server Component: it fetches settings + categories itself (cached in
 * lib/api.ts) so it ships fully-rendered HTML on every page.
 */

import Link from 'next/link'
import { getSettings, getCategories } from '@/lib/api'
import type { SiteSettings } from '@/lib/types'
import NewsletterForm from './NewsletterForm'

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
function YouTubeIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}
function WhatsAppGlyph() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

const INFORMATION = [
  { label: 'Shop All',       href: '/products' },
  { label: 'About Us',       href: '/about' },
  { label: 'Contact Us',     href: '/contact' },
]

export default async function Footer() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    getCategories(),
  ])
  const s: SiteSettings = settings || {}
  const brand = s.brand_name || 'Opal Perfume'

  const socials = [
    s.facebook_url  && { href: s.facebook_url,  label: 'Facebook',  Icon: FacebookIcon },
    s.instagram_url && { href: s.instagram_url, label: 'Instagram', Icon: InstagramIcon },
    s.youtube_url   && { href: s.youtube_url,   label: 'YouTube',   Icon: YouTubeIcon },
    s.whatsapp_number && {
      href: `https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`,
      label: 'WhatsApp',
      Icon: WhatsAppGlyph,
    },
  ].filter(Boolean) as { href: string; label: string; Icon: () => React.ReactElement }[]

  return (
    <footer className="border-t border-line bg-black text-muted">
      <div className="container-page--xl mx-auto px-10 py-14">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" aria-label={`${brand} — home`} className="inline-flex">
              {/* Plain <img> — see Navbar.tsx for rationale */}
              <img src="/logo.png" alt={brand} className="h-auto w-[240px] max-w-full" />
            </Link>
            {s.footer_tagline && (
              <p className="text-sm leading-relaxed text-muted">{s.footer_tagline}</p>
            )}
          </div>

          {/* Information */}
          <nav aria-label="Information" className="flex flex-col gap-4">
            <h2 className="h6 text-gold">Information</h2>
            <ul className="flex flex-col gap-2.5">
              {INFORMATION.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm transition-colors hover:text-gold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Collections */}
          {categories.length > 0 && (
            <nav aria-label="Collections" className="flex flex-col gap-4">
              <h2 className="h6 text-gold">Collections</h2>
              <ul className="flex flex-col gap-2.5">
                {categories.map((cat) => (
                  <li key={cat.id || cat.slug}>
                    <Link
                      href={`/products/${cat.slug}`}
                      className="text-sm transition-colors hover:text-gold"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Contact + newsletter */}
          <div className="flex flex-col gap-4">
            <h2 className="h6 text-gold">Contact Us</h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {s.contact_email && (
                <li>
                  <a href={`mailto:${s.contact_email}`} className="transition-colors hover:text-gold">
                    {s.contact_email}
                  </a>
                </li>
              )}
              {s.contact_phone && (
                <li>
                  <a href={`tel:${s.contact_phone}`} className="transition-colors hover:text-gold">
                    {s.contact_phone}
                  </a>
                </li>
              )}
              {s.address && <li>{s.address}</li>}
            </ul>

            <div className="mt-2">
              <p className="mb-3 text-sm text-muted">
                Sign up to our newsletter for exclusive offers.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>

        {/* Social row */}
        {socials.length > 0 && (
          <div className="mt-12 flex justify-center">
            <ul className="flex items-center gap-5 border border-line px-6 py-3">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="block text-gold/70 transition-colors hover:text-gold"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-line py-6">
        <p className="container-page text-center text-xs uppercase tracking-[0.18em] text-muted-2">
          © {new Date().getFullYear()} — {brand}
        </p>
      </div>
    </footer>
  )
}
