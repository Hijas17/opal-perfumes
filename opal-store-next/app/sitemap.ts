import type { MetadataRoute } from 'next'
import { getProducts, getCategories } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/about`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Pull dynamic routes from the API; fall back to empty arrays if the API is unreachable
  let categories: Awaited<ReturnType<typeof getCategories>> = []
  let products:   Awaited<ReturnType<typeof getProducts>>   = []
  try {
    [categories, products] = await Promise.all([getCategories(), getProducts()])
  } catch {
    // Sitemap should still build during dev / when API is down
  }

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url:            `${SITE_URL}/products/${c.slug}`,
    lastModified:   now,
    changeFrequency: 'daily',
    priority:        0.85,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => {
    let lastModified = now
    if (p.updated_at) {
      const parsed = new Date(p.updated_at)
      if (!Number.isNaN(parsed.getTime())) lastModified = parsed
    }
    return {
      url:            `${SITE_URL}/products/${p.subcategory_slug || 'all'}/${p.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority:        0.7,
    }
  })

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
