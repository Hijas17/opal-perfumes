'use client'

/**
 * Square quantity stepper. Two sizes, matching the reference:
 * 128×45 on the product page, 63×23 in the cart drawer.
 */

import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  disabled?: boolean
  size?: 'md' | 'sm'
  label?: string
}

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
  label = 'Quantity',
}: Props) {
  const icon = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'

  return (
    <div
      className={`quantity-selector${size === 'sm' ? ' quantity-selector--sm' : ''}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className={icon} />
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className={icon} />
      </button>
    </div>
  )
}
