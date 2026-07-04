'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Banner {
  src: string
  alt: string
  href?: string
}

interface Props {
  banners: Banner[]
}

export default function MobileBannerCarousel({ banners }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const page = Math.round(el.scrollLeft / el.clientWidth)
      setActive(page)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (banners.length === 0) return null

  return (
    <section className="bg-white py-4">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner, i) => (
          <div key={i} className="flex-none w-full snap-start px-4">
            {banner.href ? (
              <Link href={banner.href} className="block relative aspect-[3/2] overflow-hidden">
                <Image src={banner.src} alt={banner.alt} fill sizes="100vw" className="object-cover" />
              </Link>
            ) : (
              <div className="relative aspect-[3/2] overflow-hidden">
                <Image src={banner.src} alt={banner.alt} fill sizes="100vw" className="object-cover" />
              </div>
            )}
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {banners.map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-2 h-2 rounded-full',
                i === active ? 'bg-[#1a1a1a]' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
