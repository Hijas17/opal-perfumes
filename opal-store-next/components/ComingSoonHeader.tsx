/**
 * TEMPORARY — minimal top bar for the "Coming Soon" shell: logo + a single
 * Contact link. Replaces Navbar/MobileShell (which are product/cart/search
 * heavy) while NEXT_PUBLIC_COMING_SOON is on.
 */

import Link from 'next/link'

export default function ComingSoonHeader() {
  return (
    <header className="sticky top-0 z-20 bg-transparent backdrop-blur-sm">
      <div className="mx-auto max-w-[1120px] px-6 h-[74px] flex items-center justify-between">
        <Link href="/" aria-label="Opal Perfume — home" className="flex items-center">
          {/* Plain <img> — gold-on-transparent logo, same rationale as Navbar */}
          <img src="/logo.png" alt="Opal Perfume" width={702} height={205} className="h-10 w-auto" />
        </Link>
        <Link href="/#contact"
           className="text-[0.76rem] uppercase tracking-[0.14em] text-[#a49a86] hover:text-gold transition-colors">
          Contact
        </Link>
      </div>
    </header>
  )
}
