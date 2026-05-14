'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

const SORT_OPTIONS = [
  { value: '',           label: 'Default'         },
  { value: 'newest',     label: 'Newest'          },
  { value: 'name_asc',   label: 'Name A–Z'        },
  { value: 'name_desc',  label: 'Name Z–A'        },
  { value: 'price_asc',  label: 'Price Low–High'  },
  { value: 'price_desc', label: 'Price High–Low' },
]

export default function SortSelect({ defaultValue = '' }: { defaultValue?: string }) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set('sort', e.target.value)
    else                params.delete('sort')
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
      <select
        id="sort"
        defaultValue={defaultValue}
        onChange={handleChange}
        className="text-sm border border-gray-200 rounded-[var(--radius-btn)] px-3 py-1.5 text-[#1a1a1a] outline-none focus:border-gold transition-colors"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
