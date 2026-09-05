'use client'

/**
 * Footer newsletter signup.
 *
 * There is no newsletter endpoint on the API, so this posts through the
 * existing inquiry endpoint with a clear subject. If a real mailing-list
 * integration is added later, only `submitInquiry` here needs swapping.
 */

import { useState } from 'react'
import { submitInquiry } from '@/lib/api'

type State = 'idle' | 'sending' | 'done' | 'error'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('sending')
    try {
      await submitInquiry({
        name: 'Newsletter subscriber',
        email: email.trim(),
        subject: 'Newsletter signup',
        message: `Please add ${email.trim()} to the newsletter list.`,
      })
      setState('done')
      setEmail('')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return <p className="text-sm text-gold">Thank you — you&rsquo;re on the list.</p>
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="h-[46px] w-full border border-line bg-transparent px-[12.8px] py-[10.4px] text-sm text-ink outline-none placeholder:text-muted-2 focus:border-gold"
      />
      <button type="submit" disabled={state === 'sending'} className="btn w-[150px]">
        {state === 'sending' ? 'Sending…' : 'Subscribe'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-sale">Could not subscribe right now. Please try again.</p>
      )}
    </form>
  )
}
