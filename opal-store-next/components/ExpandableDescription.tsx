'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  /** HTML content (admin-authored) — sanitized upstream, rendered via dangerouslySetInnerHTML. */
  html: string
  /** Collapsed height in px. Content taller than this shows Show More. */
  collapsedHeight?: number
}

export default function ExpandableDescription({ html, collapsedHeight = 160 }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-8">
      <div
        className="rich-text text-muted leading-relaxed relative overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: expanded ? '4000px' : `${collapsedHeight}px` }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {!expanded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent"
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-gold hover:text-[#8a6420] transition-colors"
      >
        {expanded ? 'Show less' : 'Show more'}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  )
}
