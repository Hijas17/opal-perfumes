'use client'

/**
 * "Where should we deliver?" — the area picker behind the header's location
 * button.
 *
 * Areas come from the curated list in lib/delivery-areas.ts, grouped by region
 * and filterable by a search box. "Use my location" asks the browser for
 * coordinates and reverse-geocodes them with OpenStreetMap's Nominatim, which
 * needs no API key; its usage policy allows occasional user-initiated lookups
 * like this one (never call it in a loop or on page load).
 */

import { useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, LoaderCircle, LocateFixed, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DELIVERY_REGIONS, matchLocation } from '@/lib/delivery-areas'
import type { DeliveryLocation } from './LocationProvider'

interface Props {
  onClose: () => void
  selected: DeliveryLocation
  onSelect: (region: string, area: string) => void
}

type GeoStatus =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'message'; text: string }

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

interface NominatimAddress {
  country?: string
  country_code?: string
  state?: string
  city?: string
  town?: string
  village?: string
  suburb?: string
  quarter?: string
  neighbourhood?: string
  residential?: string
  city_district?: string
  /** Where Nominatim puts "Al Ain" — it has no city of that name. */
  county?: string
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10_000,
      maximumAge: 10 * 60_000,
    }),
  )
}

/** Mounted only while open, so every opening starts with a clear search. */
export default function LocationDialog({ onClose, selected, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [geo, setGeo] = useState<GeoStatus>({ kind: 'idle' })
  const listRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.entries(DELIVERY_REGIONS)
      .map(([region, areas]) => {
        const sorted = [...areas].sort((a, b) => a.localeCompare(b))
        // Typing an emirate's name shows all of it; otherwise filter areas.
        if (!q || region.toLowerCase().includes(q)) return { region, areas: sorted }
        return { region, areas: sorted.filter((a) => a.toLowerCase().includes(q)) }
      })
      .filter((g) => g.areas.length > 0)
  }, [query])

  const scrollToRegion = (region: string) => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-region="${CSS.escape(region)}"]`)
        ?.scrollIntoView({ block: 'start' })
    })
  }

  async function locateMe() {
    if (!('geolocation' in navigator)) {
      setGeo({ kind: 'message', text: 'Your browser can’t share its location. Please pick your area below.' })
      return
    }
    setGeo({ kind: 'locating' })

    let coords: GeolocationCoordinates
    try {
      coords = (await getPosition()).coords
    } catch (err) {
      const denied = (err as GeolocationPositionError)?.code === 1
      setGeo({
        kind: 'message',
        text: denied
          ? 'Location access was blocked. Please pick your area below.'
          : 'We couldn’t get your location. Please pick your area below.',
      })
      return
    }

    let address: NominatimAddress
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(coords.latitude),
        lon: String(coords.longitude),
        zoom: '16',
        addressdetails: '1',
        'accept-language': 'en',
      })
      const res = await fetch(`${NOMINATIM_REVERSE}?${params}`)
      if (!res.ok) throw new Error(`reverse geocode http ${res.status}`)
      address = ((await res.json()) as { address?: NominatimAddress }).address ?? {}
    } catch {
      setGeo({ kind: 'message', text: 'We couldn’t look up your area. Please pick it below.' })
      return
    }

    if (address.country_code && address.country_code.toLowerCase() !== 'ae') {
      setGeo({
        kind: 'message',
        text: `It looks like you’re in ${address.country ?? 'another country'}. We currently deliver within the UAE only.`,
      })
      return
    }

    const places = [
      address.neighbourhood, address.residential, address.quarter, address.suburb,
      address.city_district, address.village, address.town, address.city, address.county,
    ].filter((p): p is string => Boolean(p))

    const match = matchLocation(address.state, places)
    if (match?.area) {
      onSelect(match.region, match.area)
      return
    }

    if (match) {
      // Narrow to what the geocoder called the neighbourhood when that finds
      // something in our list; otherwise just jump to the emirate.
      const hint = match.hint
      const hintHits = hint
        ? DELIVERY_REGIONS[match.region].some((a) => a.toLowerCase().includes(hint.toLowerCase()))
        : false
      if (hint && hintHits) {
        setQuery(hint)
      } else {
        setQuery('')
        scrollToRegion(match.region)
      }
      setGeo({ kind: 'message', text: `We found you in ${match.region}. Please confirm your area below.` })
      return
    }

    setGeo({ kind: 'message', text: 'We couldn’t match your location to an area. Please pick it below.' })
  }

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay-enter fixed inset-0 z-[999] bg-black/60" />

        <Dialog.Content
          className={cn(
            'search-overlay-enter fixed left-1/2 top-1/2 z-[1000] flex w-[calc(100%-2rem)] max-w-[440px]',
            '-translate-x-1/2 -translate-y-1/2 flex-col border border-line bg-black',
            'max-h-[min(640px,calc(100dvh-2rem))]',
          )}
          // Don't pop the on-screen keyboard over the list on phones.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="h5 text-gold">Where should we deliver?</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted">
                Pick your area so we can plan your delivery.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="mt-0.5 flex-shrink-0 text-muted transition-colors hover:text-gold"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="space-y-3 px-5 pt-4">
            <button
              type="button"
              onClick={locateMe}
              disabled={geo.kind === 'locating'}
              className="btn btn--outline w-full"
            >
              {geo.kind === 'locating' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LocateFixed className="h-4 w-4" aria-hidden />
              )}
              {geo.kind === 'locating' ? 'Finding you…' : 'Use my location'}
            </button>

            {geo.kind === 'message' && (
              <p role="status" className="text-xs leading-relaxed text-ink/80">{geo.text}</p>
            )}

            <label className="flex items-center gap-2 border border-line bg-surface-2 px-3">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your area…"
                aria-label="Search your area"
                className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted-2"
              />
            </label>
          </div>

          <div ref={listRef} className="mt-3 min-h-0 flex-1 overflow-y-auto px-5">
            {groups.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-2">
                No areas match &ldquo;{query.trim()}&rdquo;.
              </p>
            )}

            {groups.map(({ region, areas }) => (
              <section key={region} data-region={region}>
                <h3 className="eyebrow sticky top-0 z-[1] bg-black py-2 text-[0.6875rem]">{region}</h3>
                <ul>
                  {areas.map((area) => {
                    const isSelected = selected.region === region && selected.area === area
                    return (
                      <li key={area}>
                        <button
                          type="button"
                          aria-current={isSelected || undefined}
                          onClick={() => onSelect(region, area)}
                          className={cn(
                            'flex w-full items-center justify-between border-b border-line-soft py-2.5 text-left text-sm transition-colors',
                            isSelected ? 'text-gold' : 'text-ink/85 hover:text-gold',
                          )}
                        >
                          {area}
                          {isSelected && <Check className="h-3.5 w-3.5" aria-hidden />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          <footer className="border-t border-line px-5 py-3">
            <Dialog.Close className="text-xs uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold">
              Skip for now
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
