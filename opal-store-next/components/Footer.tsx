/**
 * Footer is a Server Component — fetches settings + categories at request time
 * (cached for 5 min via lib/api.ts) so it ships fully-rendered HTML on every page.
 */

import Link from 'next/link'
import { getSettings, getCategories } from '@/lib/api'
import type { SiteSettings } from '@/lib/types'

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}
function YouTubeIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}
function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

export default async function Footer() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()])
  const s: SiteSettings = settings || {}

  return (
    <footer className="bg-[#1a1a1a] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="font-display text-2xl font-semibold text-gold">
              {s.brand_name || 'Opal Perfumes'}
            </Link>
            {s.footer_tagline && (
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">{s.footer_tagline}</p>
            )}
            <div className="flex gap-4 mt-5">
              {s.facebook_url && (
                <a href={s.facebook_url} target="_blank" rel="noopener noreferrer"
                   className="text-gray-500 hover:text-gold transition-colors duration-300" aria-label="Facebook">
                  <FacebookIcon />
                </a>
              )}
              {s.instagram_url && (
                <a href={s.instagram_url} target="_blank" rel="noopener noreferrer"
                   className="text-gray-500 hover:text-gold transition-colors duration-300" aria-label="Instagram">
                  <InstagramIcon />
                </a>
              )}
              {s.youtube_url && (
                <a href={s.youtube_url} target="_blank" rel="noopener noreferrer"
                   className="text-gray-500 hover:text-gold transition-colors duration-300" aria-label="YouTube">
                  <YouTubeIcon />
                </a>
              )}
              {s.whatsapp_number && (
                <a href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                   className="text-gray-500 hover:text-gold transition-colors duration-300" aria-label="WhatsApp">
                  <WhatsAppIcon />
                </a>
              )}
              {!s.facebook_url && !s.instagram_url && !s.youtube_url && !s.whatsapp_number && (
                <span className="text-xs text-gray-600 italic">No social links configured</span>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-white text-base font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/products" className="hover:text-gold transition-colors duration-300">All Products</Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id || cat.slug}>
                  <Link href={`/products/${cat.slug}`} className="hover:text-gold transition-colors duration-300">
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li><Link href="/about"   className="hover:text-gold transition-colors duration-300">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition-colors duration-300">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-white text-base font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              {s.contact_email && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <a href={`mailto:${s.contact_email}`} className="hover:text-gold transition-colors duration-300">
                    {s.contact_email}
                  </a>
                </li>
              )}
              {s.contact_phone && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <a href={`tel:${s.contact_phone}`} className="hover:text-gold transition-colors duration-300">
                    {s.contact_phone}
                  </a>
                </li>
              )}
              {s.address && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>{s.address}</span>
                </li>
              )}
              {!s.contact_email && !s.contact_phone && !s.address && (
                <li className="text-gray-600 text-xs italic">Contact info not configured</li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} {s.brand_name || 'Opal Perfumes'}. All Rights Reserved.
        </div>
      </div>
    </footer>
  )
}
