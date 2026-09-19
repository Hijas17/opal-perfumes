'use client'

import { useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { stripePublishableKey } from '@/lib/config'

/**
 * Stripe's embedded Checkout, mounted inside our own page.
 *
 * `loadStripe` is called at module scope on purpose: it injects Stripe.js into
 * the document, and calling it per-render would re-request the script on every
 * pass. It returns a promise rather than resolving immediately, which is why
 * the provider accepts it directly.
 *
 * The key is read through the config module so a missing key degrades to
 * `null` here instead of throwing during module evaluation and taking the
 * whole checkout route down.
 */
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface Props {
  /** Checkout Session secret minted by the API. Scoped to one session. */
  clientSecret: string
  /** Lets the customer back out and return to the shipping form. */
  onCancel: () => void
}

export default function StripeCheckout({ clientSecret, onCancel }: Props) {
  // Identity-stable so the provider doesn't tear down and remount the iframe
  // on every parent render, which would visibly flash the payment form.
  const options = useMemo(() => ({ clientSecret }), [clientSecret])

  if (!stripePromise) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
        Card payment is not configured. Please choose cash on delivery.
      </div>
    )
  }

  return (
    <div>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>

      <button
        type="button"
        onClick={onCancel}
        className="block mx-auto mt-6 text-sm text-muted hover:text-gold transition-colors"
      >
        Cancel and edit my details
      </button>
    </div>
  )
}
