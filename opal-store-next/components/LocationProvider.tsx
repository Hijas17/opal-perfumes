'use client'

/**
 * The shopper's delivery area within the UAE (emirate + area), persisted per
 * browser. Unset until they pick one.
 *
 * Owns the "Where should we deliver?" dialog so the header and the mobile menu
 * drawer open the same instance. Checkout reads the region to pre-fill the
 * city; nothing else depends on it yet.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { isKnownArea } from '@/lib/delivery-areas'
import LocationDialog from './LocationDialog'

const STORAGE_KEY = 'opal:location:v1'

export interface DeliveryLocation {
  region?: string
  area?: string
}

interface LocationState {
  location: DeliveryLocation
  setArea: (region: string, area: string) => void
  openPicker: () => void
}

const DEFAULT_LOCATION: DeliveryLocation = {}

const Ctx = createContext<LocationState | null>(null)

export function useDeliveryLocation(): LocationState {
  return (
    useContext(Ctx) ?? {
      location: DEFAULT_LOCATION,
      setArea: () => {},
      openPicker: () => {},
    }
  )
}

/** Drops anything that no longer matches the curated list (renamed/removed areas). */
function parse(raw: string | null): DeliveryLocation | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<DeliveryLocation>
    if (v.region && v.area && isKnownArea(v.region, v.area)) {
      return { region: v.region, area: v.area }
    }
    return null
  } catch {
    return null
  }
}

export default function LocationProvider({ children }: { children: ReactNode }) {
  // Start from the default so server and client markup match; the stored
  // choice is applied after mount.
  const [location, setLocation] = useState<DeliveryLocation>(DEFAULT_LOCATION)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = parse(window.localStorage.getItem(STORAGE_KEY))
      if (saved) setLocation(saved)
    } catch {
      /* private mode / blocked storage — stay on the default */
    }
  }, [])

  const persist = useCallback((next: DeliveryLocation) => {
    setLocation(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* non-fatal: the choice just won't survive a reload */
    }
  }, [])

  const setArea = useCallback(
    (region: string, area: string) => {
      persist({ region, area })
      setPickerOpen(false)
    },
    [persist],
  )

  const openPicker = useCallback(() => setPickerOpen(true), [])

  // Keep other tabs in sync, same as the cart does.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setLocation(parse(e.newValue) ?? DEFAULT_LOCATION)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <Ctx.Provider value={{ location, setArea, openPicker }}>
      {children}
      {pickerOpen && (
        <LocationDialog
          onClose={() => setPickerOpen(false)}
          selected={location}
          onSelect={setArea}
        />
      )}
    </Ctx.Provider>
  )
}
