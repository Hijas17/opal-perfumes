/**
 * TEMPORARY — dark "Coming Soon" shell shown on the home page while the site is
 * rebuilt for the new dark theme (gated by NEXT_PUBLIC_COMING_SOON, see proxy.ts).
 * Reuses the existing ContactForm (dark variant) so the inquiry flow is unchanged.
 * Styling lives under the scoped `.coming-soon` block in globals.css.
 */

import { Suspense } from 'react'
import ContactForm from '@/components/ContactForm'
import type { SiteSettings } from '@/lib/types'

interface ComingSoonProps {
  settings: SiteSettings
}

export default function ComingSoon({ settings: s }: ComingSoonProps) {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[84vh] flex items-center text-center overflow-hidden">
        <div className="cs-glow" />
        <div className="cs-grain" />
        <div className="relative mx-auto max-w-[780px] px-6 py-20">
          {/* Droplet emblem — plain <img>, same rationale as Navbar/Footer */}
          <img
            src="/logo-icon.png"
            alt=""
            aria-hidden
            className="cs-droplet mx-auto mb-7 h-24 w-auto"
            style={{ filter: 'drop-shadow(0 10px 26px rgba(200,160,77,0.35))' }}
          />

          <span className="cs-eyebrow cs-rise cs-d1">
            <span className="cs-tick" />
            The Art of Arabian Perfumery
          </span>

          <h1 className="cs-rise cs-d2 mt-6 mb-1 font-semibold leading-[1] tracking-[0.01em]"
              style={{ fontSize: 'clamp(2.9rem, 8.5vw, 6rem)' }}>
            Something<br />
            <span className="cs-goldword">beautiful</span> is coming.
          </h1>

          <p className="cs-rise cs-d3 mx-auto mt-6 max-w-[520px] text-[#a49a86]"
             style={{ fontSize: 'clamp(1rem, 1.4vw, 1.16rem)' }}>
            We&rsquo;re crafting a new experience for {s.brand_name || 'Opal Perfume'}. Our doors
            reopen soon — until then, our fragrance experts are only a message away.
          </p>

          <div className="cs-shimmer cs-rise cs-d4" />

          <p className="cs-rise cs-d4 mt-10 text-xs uppercase tracking-[0.2em] text-[#726a5a]">
            Questions in the meantime?{' '}
            <a href="#contact" className="cs-link inline-flex items-center gap-2 text-gold">
              Get in touch <span className="cs-arrow">→</span>
            </a>
          </p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <section id="contact" className="border-t border-[#221f19] py-24 px-6">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-14 flex flex-col items-center gap-4 text-center">
            <span className="cs-eyebrow"><span className="cs-tick" />Get in Touch</span>
            <h2 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>
              We&rsquo;d love to hear from you
            </h2>
          </div>

          {/* Form — centered, dark variant of the shared ContactForm */}
          <div className="mx-auto w-full max-w-[640px] bg-[#17150f] border border-[#2a2620] rounded-[6px] p-9 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <Suspense fallback={<div className="text-sm text-[#726a5a]">Loading form…</div>}>
              <ContactForm variant="dark" />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}
