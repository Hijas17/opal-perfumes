/**
 * On-demand cache purge, called by the API whenever the admin writes something.
 *
 * WHY THIS EXISTS
 * ---------------
 * Storefront reads are cached server-side by Next (see lib/api.ts — settings
 * 5 min, categories 10 min, products 1–2 min). Those TTLs are what make the
 * site fast, but they also meant an admin edit took up to ten minutes to show
 * up, and no amount of hard-reloading in the browser helped: the stale copy
 * lives in the Next server's cache, not the visitor's.
 *
 * So the API now tells us the moment something changes, and we drop the
 * affected entries. The TTLs stay as a safety net for the case where this ping
 * never arrives (storefront restarting, network blip) — they are the ceiling on
 * staleness, no longer the normal path.
 *
 * WHY EVERY TAG, EVERY TIME
 * -------------------------
 * The API does not tell us WHAT it changed, only that it changed. Mapping admin
 * routes to tags would mean a second copy of the route table living in a
 * different language from the one it describes, silently drifting the first
 * time someone adds an endpoint. Writes are human-paced — a handful an hour at
 * most — so purging all three tags costs three refetches and removes the whole
 * category of "edited X, but the page reading X was tagged Y".
 */

import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

/** Must match the tags passed to `next: { tags }` in lib/api.ts. */
const TAGS = ['settings', 'categories', 'products'] as const

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET

  // Refuse rather than run unauthenticated: an open purge endpoint lets anyone
  // force a cache miss on every request, which is a free load amplifier.
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: 'REVALIDATE_SECRET is not configured' },
      { status: 503 },
    )
  }
  if (request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 })
  }

  // `{ expire: 0 }` rather than the 'max' profile: 'max' serves the stale copy
  // once more while it refetches in the background, so the first reload after
  // saving would STILL show the old value — exactly the complaint this fixes.
  // Expiring outright makes the next request wait for fresh data instead.
  for (const tag of TAGS) revalidateTag(tag, { expire: 0 })

  return NextResponse.json({ ok: true, revalidated: TAGS, at: Date.now() })
}
