import Link from 'next/link'

interface HeroStaticProps {
  heroTagline: string
  heroHeadline: string
  heroSubtext: string
}

/**
 * Static desktop hero — a single sharp bottle image on the gold/brown theme,
 * replacing the scroll-video (whose source frames were too low-quality). The
 * section is transparent so the page's gold light-leak shows through.
 */
export default function HeroStatic({ heroTagline, heroHeadline, heroSubtext }: HeroStaticProps) {
  return (
    <section className="relative overflow-hidden" style={{ marginTop: '-70px', paddingTop: '70px' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 min-h-[88vh] grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] items-center gap-6">
        {/* Copy */}
        <div className="relative z-10 max-w-xl">
          <p className="opal-eyebrow">{heroTagline || 'Luxury Fragrances'}</p>
          <h1 className="opal-display">
            {(heroHeadline || 'Discover\nyour scent.').split('\n').map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>
          <p className="opal-subtext mt-6 max-w-md">
            {heroSubtext || 'Handcrafted luxury perfumes that tell your story. Each bottle a masterpiece.'}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/products" className="opal-cta-primary">Shop Now</Link>
            <Link href="/about" className="opal-cta-ghost">Learn More</Link>
          </div>
        </div>

        {/* Bottle */}
        <div className="relative flex items-center justify-center">
          {/* soft gold glow behind the bottle */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(closest-side, rgba(212,169,78,0.22), transparent 72%)',
            }}
          />
          {/* Plain <img> — same rationale as Navbar/Footer */}
          <img
            src="/hero-bottle.webp"
            alt="Opal Perfume signature bottle"
            width={1080}
            height={608}
            className="relative w-full max-w-[760px] h-auto object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
          />
        </div>
      </div>
    </section>
  )
}
