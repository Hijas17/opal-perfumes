import { cache } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getProduct, getProducts, getSettings } from '@/lib/api'
import { getImageUrl } from '@/lib/image'
import { showPrices, buildWhatsAppUrl, whatsappFallback } from '@/lib/config'
import ProductGallery from '@/components/ProductGallery'
import SocialShare from '@/components/SocialShare'
import ProductBuyBlock from '@/components/ProductBuyBlock'
import ComplementaryProducts from '@/components/ComplementaryProducts'
import Price from '@/components/Price'
import Accordion from '@/components/Accordion'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const LABEL_CLASS: Record<string, string> = {
  'new':             'badge badge--new',
  'bestseller':      'badge badge--bestseller',
  'limited edition': 'badge badge--limited',
  'featured':        'badge badge--featured',
}

// React `cache` dedupes the request between generateMetadata and the page
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
  // Admin-supplied metadata wins; the generated version is the fallback.
  const generatedDescription = (
    [p.short_description, scentSummary && `Scent notes: ${scentSummary}.`]
      .filter(Boolean)
      .join(' ')
      .slice(0, 155)
  ) || `Buy ${p.name} — a luxury ${catName || 'Arabian'} fragrance by Opal Perfumes. Available in UAE.`

  const description = p.meta_description?.trim() || generatedDescription
  const title = p.meta_title?.trim() || `${p.name} — ${catName || 'Luxury Perfume'} UAE`

  const url = `/products/${catSlug}/${slug}`
  const adminKeywords = Array.isArray(p.seo_keywords) ? p.seo_keywords.filter(Boolean) : []
  const defaultKeywords = [
    p.name,
    `${catName || 'perfume'} UAE`,
    `buy ${p.name} UAE`,
    `luxury ${catName?.toLowerCase() || 'fragrance'} Dubai`,
    'Arabian perfumes', 'Opal Perfumes',
  ]
  const seen = new Set<string>()
  const keywords = [...adminKeywords, ...defaultKeywords].filter((kw) => {
    const k = kw.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: p.meta_title?.trim() || `${p.name} — Opal Perfumes`,
      description,
      url,
      images: productImage ? [productImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: p.meta_title?.trim() || `${p.name} — Opal Perfumes`,
      description,
      images: productImage ? [productImage] : undefined,
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { category: routeCatSlug, slug } = await params
  const [p, settings] = await Promise.all([fetchProduct(slug), getSettings()])
  if (!p) notFound()

  const brandName = settings.brand_name || 'Opal Perfume'
  const catSlug = p.subcategory_slug || p.category?.slug || routeCatSlug || 'all'
  const catName = p.subcategory_name || p.category?.name || ''

  // No recommendations endpoint — use same-category products, current excluded.
  const siblings = (await getProducts({ category: catSlug, limit: 6 }))
    .filter((s) => s.slug !== p.slug)
    .slice(0, 4)

  const waNumber = settings.whatsapp_number || whatsappFallback
  const productPageUrl = `${SITE_URL}/products/${catSlug}/${p.slug}`
  const waHref = waNumber
    ? buildWhatsAppUrl(waNumber, `Hi! I'd like to inquire about ${p.name}.\n${productPageUrl}`)
    : null

  const labelKey = p.label?.toLowerCase()
  const labelClass = labelKey ? LABEL_CLASS[labelKey] : null

  // ── Gallery media ──────────────────────────────────────────────────────
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

  const purchaseLinks = Array.isArray(p.purchase_links)
    ? p.purchase_links
    : p.purchase_links ? [p.purchase_links] : []

  const scentNotes = p.scent_notes || {}
  const hasScent = Boolean(scentNotes.top || scentNotes.middle || scentNotes.base)

  // ── JSON-LD ────────────────────────────────────────────────────────────
  const productImage = imgs.primary ? getImageUrl(imgs.primary) : undefined

  const breadcrumbItems = [
    { '@type': 'ListItem', 'position': 1, 'name': 'Home',     'item': SITE_URL },
    { '@type': 'ListItem', 'position': 2, 'name': 'Products', 'item': `${SITE_URL}/products` },
  ]
  if (catName) {
    breadcrumbItems.push({
      '@type': 'ListItem', 'position': 3, 'name': catName, 'item': `${SITE_URL}/products/${catSlug}`,
    })
  }
  breadcrumbItems.push({
    '@type': 'ListItem', 'position': catName ? 4 : 3, 'name': p.name, 'item': productPageUrl,
  })

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        'name': p.name,
        'description': p.short_description || `${p.name} — a luxury ${catName || 'Arabian'} fragrance.`,
        'image': productImage,
        'sku': p.slug,
        'brand': { '@type': 'Brand', 'name': brandName },
        'category': catName || 'Perfume',
        ...(showPrices && p.price && {
          'offers': {
            '@type': 'Offer',
            'priceCurrency': p.currency || 'AED',
            'price': parseFloat(String(p.price)).toFixed(2),
            'availability': p.status === 'published' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'url': productPageUrl,
            'seller': { '@type': 'Organization', 'name': brandName },
          },
        }),
        ...(hasScent && {
          'additionalProperty': [
            scentNotes.top    && { '@type': 'PropertyValue', 'name': 'Top Notes',    'value': scentNotes.top },
            scentNotes.middle && { '@type': 'PropertyValue', 'name': 'Middle Notes', 'value': scentNotes.middle },
            scentNotes.base   && { '@type': 'PropertyValue', 'name': 'Base Notes',   'value': scentNotes.base },
          ].filter(Boolean),
        }),
      },
      { '@type': 'BreadcrumbList', 'itemListElement': breadcrumbItems },
    ],
  }

  return (
    <div className="pt-16 md:pt-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Main product section ─────────────────────────────────────── */}
      <section className="section-spacing--tight bg-surface">
        <div className="container-page">
          <nav className="mb-8 flex items-center gap-2 text-xs text-muted-2">
            <Link href="/" className="transition-colors hover:text-gold">Home</Link>
            <span>/</span>
            <Link href="/products" className="transition-colors hover:text-gold">Products</Link>
            {catName && (
              <>
                <span>/</span>
                <Link href={`/products/${catSlug}`} className="transition-colors hover:text-gold">{catName}</Link>
              </>
            )}
            <span>/</span>
            <span className="max-w-[180px] truncate text-muted">{p.name}</span>
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left — gallery, then the accordions beneath it */}
            <div>
              <ProductGallery productName={p.name} thumbnails={thumbnails} />

              <div className="mt-12">
                {hasScent && (
                  <Accordion summary="Fragrance Notes" defaultOpen>
                    <dl className="grid gap-2 text-sm">
                      {scentNotes.top && (
                        <div className="flex gap-2">
                          <dt className="text-muted">Top Notes:</dt>
                          <dd className="text-ink">{scentNotes.top}</dd>
                        </div>
                      )}
                      {scentNotes.middle && (
                        <div className="flex gap-2">
                          <dt className="text-muted">Middle Notes:</dt>
                          <dd className="text-ink">{scentNotes.middle}</dd>
                        </div>
                      )}
                      {scentNotes.base && (
                        <div className="flex gap-2">
                          <dt className="text-muted">Base Notes:</dt>
                          <dd className="text-ink">{scentNotes.base}</dd>
                        </div>
                      )}
                    </dl>
                  </Accordion>
                )}

                <Accordion summary="Shipping &amp; Returns">
                  <div className="prose flex flex-col gap-3">
                    <p>Free delivery within the UAE on orders over AED 250.</p>
                    <p>
                      UAE: 1–3 working days. GCC: 5–8 working days. Rest of world:
                      7–10 working days. Shipping is calculated at checkout and
                      customs duties are excluded.
                    </p>
                    <p>
                      Unopened items may be returned within 14 days of delivery.
                      Opened fragrances cannot be returned for hygiene reasons.
                    </p>
                  </div>
                </Accordion>
              </div>
            </div>

            {/* Right — sticky buy column */}
            <div
              className="self-start lg:sticky"
              style={{ top: 'calc(var(--sticky-area-height) + 2rem)' }}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/products/${catSlug}`}
                    className="eyebrow transition-colors hover:text-gold"
                  >
                    {brandName}
                  </Link>
                  {labelKey && labelClass && <span className={labelClass}>{p.label}</span>}
                </div>

                <h1 className="h3 text-ink">{p.name}</h1>

                {showPrices && p.price != null && (
                  <div>
                    <Price
                      amount={p.price}
                      from={p.currency}
                      className="block text-[1.11rem] uppercase tracking-[0.18em] text-muted"
                    />
                    <p className="mt-1 text-sm text-muted-2">Tax excluded.</p>
                  </div>
                )}

                <hr className="my-2 border-line" />

                {p.short_description && <p className="prose">{p.short_description}</p>}

                {p.full_description && (
                  <div
                    className="rich-text"
                    dangerouslySetInnerHTML={{ __html: p.full_description }}
                  />
                )}

                {/* The reference renders volume as body copy, not a variant
                    picker — this product model has no variants either. */}
                {p.size_volume && !/volume/i.test(p.full_description ?? '') && (
                  <p className="prose">
                    <strong>Volume:</strong> {p.size_volume}
                  </p>
                )}

                <div className="mt-2">
                  <ProductBuyBlock product={p} whatsappHref={waHref} />
                </div>

                {purchaseLinks.length > 0 && (
                  <div className="mt-2">
                    <p className="eyebrow mb-3">Also available on</p>
                    <div className="flex flex-wrap gap-3">
                      {purchaseLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--ghost"
                        >
                          {link.platform || `Platform ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-center text-xs text-muted-2">
                  Have questions?{' '}
                  <Link href={`/contact?product=${encodeURIComponent(p.name)}`} className="text-gold hover:underline">
                    Contact us
                  </Link>
                </p>

                <ComplementaryProducts products={siblings} />

                <SocialShare productName={p.name} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Image with text — full-bleed 50/50, zero gap ──────────────── */}
      {thumbnails.length > 1 && (
        <section className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnails[1].src}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 bg-bg px-6 py-12 md:px-12">
            {catName && <p className="eyebrow">{catName}</p>}
            <h2 className="h2">{p.name}</h2>
            <p className="prose max-w-prose">
              {p.short_description ||
                `${p.name} is blended in small batches and rested before bottling, so the top notes never sit above the base — they arrive together.`}
            </p>
          </div>
        </section>
      )}

      {/* ── Media grid ────────────────────────────────────────────────── */}
      {thumbnails.length > 2 && (
        <section className="section-spacing border-t border-line">
          <div className="container-page">
            <div className="mb-10 text-center">
              <p className="eyebrow">{brandName}</p>
              <h2 className="h2 mt-2">{p.name}</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12" style={{ gridAutoRows: '280px' }}>
              {thumbnails.slice(0, 3).map((t, i) => (
                <div
                  key={t.src}
                  className={
                    i === 0
                      ? 'relative overflow-hidden md:col-span-6 md:row-span-2'
                      : 'relative overflow-hidden md:col-span-3'
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
