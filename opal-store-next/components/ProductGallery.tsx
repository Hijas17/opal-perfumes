'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Thumbnail {
  src: string
  label: string
}

interface ProductGalleryProps {
  productName: string
  thumbnails: Thumbnail[]
}

export default function ProductGallery({ productName, thumbnails }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState<string | null>(thumbnails[0]?.src || null)

  return (
    <div>
      {/* Main Image */}
      <div className="aspect-square bg-cream rounded-[var(--radius-card)] overflow-hidden mb-4 relative">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={productName}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-24 h-24 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {thumbnails.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {thumbnails.map((thumb, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImage(thumb.src)}
              className={`flex-shrink-0 w-16 h-16 rounded-[var(--radius-card)] overflow-hidden border-2 transition-all duration-200 relative ${
                activeImage === thumb.src ? 'border-gold' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image src={thumb.src} alt={thumb.label} width={64} height={64} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
