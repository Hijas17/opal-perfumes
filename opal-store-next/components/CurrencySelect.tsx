'use client'

/**
 * Currency selector for the header's top-left slot — a flag plus the code,
 * opening a small popover with the two supported options.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CURRENCIES, type CurrencyCode } from '@/lib/currency'
import { useCurrency } from './CurrencyProvider'
import { UaeFlag, UsFlag } from './FlagIcons'

const FLAG: Record<CurrencyCode, (props: { className?: string }) => React.ReactElement> = {
  AED: UaeFlag,
  USD: UsFlag,
}

export default function CurrencySelect() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const Current = FLAG[currency]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency: ${currency}. Change currency`}
        className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold/70 transition-colors hover:text-gold"
      >
        <Current />
        {currency}
        <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Currency"
          className="absolute left-0 top-full z-50 mt-3 w-36 border border-line bg-black py-1"
        >
          {CURRENCIES.map((code) => {
            const Flag = FLAG[code]
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={code === currency}
                  onClick={() => { setCurrency(code); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.18em] transition-colors',
                    code === currency ? 'text-gold' : 'text-gold/60 hover:text-gold',
                  )}
                >
                  <Flag />
                  {code}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
