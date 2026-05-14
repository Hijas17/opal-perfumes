import { cache } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getProduct } from '@/lib/api'
import { getImageUrl } from '@/lib/image'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import ProductGallery from '@/components/ProductGallery'
import SocialShare from '@/components/SocialShare'
import AddToCartButton from '@/components/AddToCartButton'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const LABEL_STYLES: Record<string, string> = {
  'new':              'bg-gold text-white',
  'bestseller':       'bg-[#1a1a1a] text-white',
  'limited edition':  'bg-purple-700 text-white',
  'featured':         'bg-blue-600 text-white',
}

// React `cache` dedupes the request between generateMetadata and the page component
const fetchProduct = cache(async (slug: string) => getProduct(slug))

interface RouteParams { category: string; slug: string }
interface PageProps { params: Promise<RouteParams> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: catSlug, slug } = await params
  const p = await fetchProduct(slug)
  if (!p) return { title: 'Product Not Found', robots: { index: false, follow: false } }

  const catName = p.subcategory_name || p.category?.name || ''
  const productImage = p.images?.primary ? getImageUrl(p.images.primary) ?? undefined : undefined
  const scentSummary = [p.scent_notes?.top, p.scent_notes?.middle, p.scent_notes?.base].filter(Boolean).join(', ')
  const description = (
    [p.short_description, scentSummary && `Scent notes: ${scentSummary}.`]
      .filter(Boolean)
      .join(' ')
      .slice(0, 155)
  ) || `Buy ${p.name} — a luxury ${catName || 'Arabian'} fragrance by Opal Perfumes. Available in UAE.`

  const url = `/products/${catSlug}/${slug}`
  return {
    title: `${p.name} — ${catName || 'Luxury Perfume'} UAE`,
    description,
    keywords: [
      p.name,
      `${catName || 'perfume'} UAE`,
      `buy ${p.name} UAE`,
      `luxury ${catName?.toLowerCase() || 'fragrance'} Dubai`,
      'Arabian perfumes', 'Opal Perfumes',
    ],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${p.name} — Opal Perfumes`,
      description,
      url,
      images: productImage ? [productImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.name} — Opal Perfumes`,
      description,
      images: productImage ? [productImage] : undefined,
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { category: routeCatSlug, slug } = await params
  const p = await fetchProduct(slug)
  if (!p) notFound()

  const catSlug = p.subcategory_slug || p.category?.slug || routeCatSlug || 'all'
  const catName = p.subcategory_name || p.category?.name || ''
  const priceStr = formatPrice(p.price, p.currency)
  const labelKey = p.label?.toLowerCase()
  const labelStyle = labelKey ? LABEL_STYLES[labelKey] : null

  // ── Build thumbnails from images object ───────────────────────────────
  const imgs = p.images || {}
  const thumbnails: { src: string; label: string }[] = []
  if (imgs.primary)     { const s = getImageUrl(imgs.primary);     if (s) thumbnails.push({ src: s, label: 'Main' }) }
  if (imgs.hover)       { const s = getImageUrl(imgs.hover);       if (s) thumbnails.push({ src: s, label: 'Alternate' }) }
  if (imgs.ingredients) { const s = getImageUrl(imgs.ingredients); if (s) thumbnails.push({ src: s, label: 'Ingredients' }) }
  if (Array.isArray(imgs.gallery)) {
    imgs.gallery.forEach((g, i) => {
      const s = getImageUrl(g)
      if (s && !thumbnails.find((t) => t.src === s)) thumbnails.push({ src: s, label: `Image ${i + 2}` })
    })
  }

  // Purchase links (single object, array, or undefined)
  const purchaseLinks = Array.isArray(p.purchase_links)
    ? p.purchase_links
    : p.purchase_links
    ? [p.purchase_links]
    : []

  const scentNotes = p.scent_notes || {}
  const hasScent = scentNotes.top || scentNotes.middle || scentNotes.base

  // ── JSON-LD Product schema ─────────────────────────────────────────────
  const productImage = imgs.primary ? getImageUrl(imgs.primary) : undefined
  const productUrl = `${SITE_URL}/products/${catSlug}/${slug}`
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': p.name,
    'description': p.short_description || `${p.name} — a luxury ${catName || 'Arabian'} fragrance.`,
    'image': productImage,
    'sku': p.slug,
    'brand': { '@type': 'Brand', 'name': 'Opal Perfumes' },
    'category': catName || 'Perfume',
    ...(p.price && {
      'offers': {
        '@type': 'Offer',
        'priceCurrency': p.currency || 'AED',
        'price': parseFloat(String(p.price)).toFixed(2),
        'availability': p.status === 'published' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'url': productUrl,
        'seller': { '@type': 'Organization', 'name': 'Opal Perfumes' },
      },
    }),
    ...(hasScent && {
      'additionalProperty': [
        scentNotes.top    && { '@type': 'PropertyValue', 'name': 'Top Notes',    'value': scentNotes.top },
        scentNotes.middle && { '@type': 'PropertyValue', 'name': 'Middle Notes', 'value': scentNotes.middle },
        scentNotes.base   && { '@type': 'PropertyValue', 'name': 'Base Notes',   'value': scentNotes.base },
      ].filter(Boolean),
    }),
    'breadcrumb': {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home',     'item': SITE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Products', 'item': `${SITE_URL}/products` },
        catName && { '@type': 'ListItem', 'position': 3, 'name': catName, 'item': `${SITE_URL}/products/${catSlug}` },
        { '@type': 'ListItem', 'position': catName ? 4 : 3, 'name': p.name, 'item': productUrl },
      ].filter(Boolean),
    },
  }

  return (
    <div className="pt-[70px] min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/"         className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gold transition-colors">Products</Link>
          {catName && (
            <>
              <span>/</span>
              <Link href={`/products/${catSlug}`} className="hover:text-gold transition-colors">{catName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#1a1a1a] truncate max-w-[180px]">{p.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Image Gallery */}
          <ProductGallery productName={p.name} thumbnails={thumbnails} />

          {/* Details */}
          <div>
            {catName && (
              <Link href={`/products/${catSlug}`}
                className="inline-block text-xs font-medium text-gold border border-gold px-3 py-1 rounded-full hover:bg-gold hover:text-white transition-all duration-200 mb-4">
                {catName}
              </Link>
            )}

            {labelKey && labelStyle && (
              <span className={cn('inline-block text-xs font-medium px-3 py-1 rounded-sm ml-2 mb-4', labelStyle)}>
                {p.label}
              </span>
            )}

            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#1a1a1a] leading-tight mb-4">
              {p.name}
            </h1>

            {priceStr && <p className="text-2xl text-gold font-semibold mb-4">{priceStr}</p>}

            {p.short_description && (
              <p className="text-gray-600 text-base leading-relaxed mb-6">{p.short_description}</p>
            )}

            {p.size_volume && (
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Volume:</span>
                <span className="text-sm font-medium text-[#1a1a1a]">{p.size_volume}</span>
              </div>
            )}

            <div className="border-t border-gray-100 my-6" />

            {p.full_description && (
              <div className="rich-text text-gray-600 leading-relaxed mb-8"
                   dangerouslySetInnerHTML={{ __html: p.full_description }} />
            )}

            {hasScent && (
              <div className="bg-cream rounded-[var(--radius-card)] p-6 mb-8">
                <h3 className="font-display text-base font-semibold text-[#1a1a1a] text-center mb-4">Scent Notes</h3>
                <div className="grid grid-cols-3 gap-4 divide-x divide-gray-200">
                  <ScentNote label="Top"    notes={scentNotes.top} />
                  <ScentNote label="Middle" notes={scentNotes.middle} />
                  <ScentNote label="Base"   notes={scentNotes.base} />
                </div>
              </div>
            )}

            {purchaseLinks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Available On</p>
                <div className="flex flex-wrap gap-3">
                  {purchaseLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                       className="inline-block border-2 border-gold text-gold px-6 py-2.5 text-sm font-medium rounded-[var(--radius-btn)] hover:bg-gold hover:text-white transition-all duration-300">
                      Buy on {link.platform || `Platform ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Primary CTA — Add to cart */}
            <div className="mb-3">
              <AddToCartButton productId={p.id || p._id || ''} productName={p.name} />
            </div>
            {/* Secondary — contact us */}
            <p className="text-xs text-gray-500 mb-6 text-center">
              Have questions?{' '}
              <Link href={`/contact?product=${encodeURIComponent(p.name)}`} className="text-gold hover:underline">
                Contact us
              </Link>
            </p>

            <SocialShare productName={p.name} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScentNote({ label, notes }: { label: string; notes?: string | null }) {
  if (!notes) return null
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-[#1a1a1a] font-medium">{notes}</p>
    </div>
  )
}
