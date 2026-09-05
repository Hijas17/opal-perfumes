/**
 * Native <details> accordion.
 *
 * The reference does NOT animate the open/close — it snaps, and only the
 * chevron rotates. Keeping it native means it works without JS and stays
 * keyboard- and screen-reader-correct for free.
 */

import type { ReactNode } from 'react'

interface Props {
  summary: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function Accordion({ summary, children, defaultOpen = false }: Props) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary className="accordion__toggle">
        {summary}
        <svg
          className="accordion__icon h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="accordion__content">{children}</div>
    </details>
  )
}
