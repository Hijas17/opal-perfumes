'use client'

/**
 * The header's top-left delivery controls: the UAE flag and label, and a
 * location button that opens the area picker, then shows the chosen
 * "Emirate — Area".
 */

import { MapPin } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useDeliveryLocation } from './LocationProvider'
import { UaeFlag } from './FlagIcons'

/** Static — the store only delivers within the UAE, so there is nothing to switch to. */
export function CountryLabel() {
  return (
    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold/70">
      <UaeFlag />
      UAE
    </span>
  )
}

interface LocationButtonProps {
  className?: string
  onClick?: () => void
  /** Show "Emirate — Area" at every width, not just from lg up (the header's squeeze point). */
  fullLabel?: boolean
}

export function LocationButton({ className, onClick, fullLabel = false }: LocationButtonProps) {
  const { location, openPicker } = useDeliveryLocation()
  const label = location.area ? `${location.region} — ${location.area}` : 'Select location'

  return (
    <button
      type="button"
      onClick={onClick ?? openPicker}
      aria-label={location.area ? `Delivering to ${label}. Change location` : 'Select your delivery location'}
      title={location.area ? label : undefined}
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/70 transition-colors hover:text-gold',
        className,
      )}
    >
      <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      {location.area ? (
        <span className="truncate">
          <span className={fullLabel ? undefined : 'hidden lg:inline'}>{location.region} — </span>
          {location.area}
        </span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </button>
  )
}
