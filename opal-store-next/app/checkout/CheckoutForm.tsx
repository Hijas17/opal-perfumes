'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CreditCard, Lock, MessageCircle, Truck } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'
import StripeCheckout from '@/components/StripeCheckout'
import { checkCoupon, placeOrder } from '@/lib/customer-api'
import { formatPrice } from '@/lib/format'
import { useMoney } from '@/components/CurrencyProvider'
import {
  buildWhatsAppUrl,
  cardPaymentEnabled,
  showPrices,
  useWhatsAppInquiry,
  whatsappFallback,
} from '@/lib/config'
import type { Cart, ShippingDetails } from '@/lib/types'

interface Props {
  whatsappNumber: string
  brandName: string
}

/**
 * Compose the WhatsApp inquiry text the customer sends to the merchant.
 * Prices are omitted when `showPrices` is off — the merchant quotes back in chat.
 *
 * Deliberately uses the STORED currency (AED), not the shopper's display
 * currency: this message is the actual order, so it must not quote a converted
 * figure the merchant would then have to reconcile.
 */
function buildInquiryMessage(
  brand: string,
  cart: Cart,
  shipping: ShippingDetails,
): string {
  const lines = [`Hi ${brand}, I'd like to order the following:`, '']
  cart.items.forEach((item, i) => {
    const base = `${i + 1}. ${item.name} × ${item.quantity}`
    if (showPrices) {
      const line = formatPrice(item.price * item.quantity, item.currency)
      lines.push(line ? `${base} — ${line}` : base)
    } else {
      lines.push(base)
    }
  })
  if (showPrices) {
    const subtotal = formatPrice(cart.subtotal, cart.currency)
    if (subtotal) {
      lines.push('', `Subtotal: ${subtotal}`)
    }
  }
  lines.push('', '*My details*')
  lines.push(`Name: ${shipping.name}`)
  lines.push(`Phone: ${shipping.phone}`)
  if (shipping.email)   lines.push(`Email: ${shipping.email}`)
  if (shipping.address) lines.push(`Address: ${shipping.address}, ${shipping.city}, ${shipping.country}`)
  if (shipping.notes)   lines.push(`Notes: ${shipping.notes}`)
  return lines.join('\n')
}

export default function CheckoutForm({ whatsappNumber, brandName }: Props) {
  const money = useMoney()
  const router = useRouter()
  const { customer, isLoggedIn, loading: authLoading } = useAuth()
  const { cart, clear: clearCart } = useCart()

  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState('')
  const [address, setAddress] = useState('')
  const [city,    setCity]    = useState('Dubai')
  const [country, setCountry] = useState('UAE')
  const [notes,   setNotes]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState('')

  // Card is the default when Stripe is configured; cash on delivery is always
  // available as a fallback.
  // WhatsApp sits alongside the payable methods rather than replacing them:
  // it records no order server-side, it hands the basket to the merchant.
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod' | 'whatsapp'>(
    cardPaymentEnabled ? 'card' : 'cod',
  )
  // Non-null once the API has minted a Checkout Session — that is the signal
  // to swap the form out for Stripe's embedded payment UI.
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Promo code. `applied` is only set once the API has confirmed the code is
  // worth something against this cart — the typed value alone never discounts
  // anything, here or on the server.
  const [couponInput, setCouponInput] = useState('')
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null)
  const [couponError, setCouponError] = useState('')
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  async function applyCoupon() {
    const code = couponInput.trim()
    if (code === '' || checkingCoupon) return
    setCheckingCoupon(true)
    setCouponError('')
    try {
      const result = await checkCoupon(code, cart.items)
      if (result.ok) {
        setApplied({ code: result.code, discount: result.discount })
        setCouponInput('')
      } else {
        setApplied(null)
        setCouponError(result.message)
      }
    } catch (err) {
      setApplied(null)
      setCouponError(err instanceof Error ? err.message : 'Could not check that code.')
    } finally {
      setCheckingCoupon(false)
    }
  }

  // A code is validated against the cart it was applied to, so changing the
  // cart has to drop it rather than carry a stale discount to submission.
  useEffect(() => {
    setApplied(null)
    setCouponError('')
  }, [cart.subtotal, cart.item_count])

  const discount = applied?.discount ?? 0
  const total = Math.max(0, cart.subtotal - discount)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace('/login?next=/checkout')
  }, [authLoading, isLoggedIn, router])

  // Redirect if cart is empty (after auth has loaded)
  useEffect(() => {
    if (!authLoading && isLoggedIn && cart.items.length === 0) router.replace('/cart')
  }, [authLoading, isLoggedIn, cart.items.length, router])

  // Pre-fill from customer profile
  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setEmail(customer.email || '')
      if (customer.address) setAddress(customer.address)
    }
  }, [customer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // A WhatsApp inquiry only needs enough to call the customer back — the rest
    // gets settled in the conversation. A real order needs somewhere to deliver to.
    const required: [string, string][] = paymentMethod === 'whatsapp'
      ? [[name, 'Name'], [phone, 'Phone']]
      : [[name, 'Name'], [phone, 'Phone'], [address, 'Address'], [city, 'City']]
    for (const [val, label] of required) {
      if (!val.trim()) { setError(`${label} is required.`); return }
    }

    const shipping: ShippingDetails = {
      name:    name.trim(),
      phone:   phone.trim(),
      email:   email.trim(),
      address: address.trim(),
      city:    city.trim(),
      country: country.trim(),
      notes:   notes.trim(),
    }

    if (paymentMethod === 'whatsapp') {
      const number = whatsappNumber || whatsappFallback
      if (!number) {
        setError('WhatsApp is not configured yet. Please contact us from the Contact page.')
        return
      }
      const url = buildWhatsAppUrl(number, buildInquiryMessage(brandName, cart, shipping))
      // Open the merchant's WhatsApp in a new tab and clear the cart — the customer
      // has handed their list off, no order is recorded server-side.
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    setSubmitting(true)
    try {
      const { order, clientSecret: secret } = await placeOrder({
        shipping,
        items: cart.items,
        // Narrowed: the WhatsApp branch returned above.
        payment_method: paymentMethod as 'card' | 'cod',
        ...(applied ? { coupon_code: applied.code } : {}),
      })

      if (secret) {
        // Card: the order exists but is unpaid. Hand off to Stripe and leave
        // the cart alone — the webhook clears it once payment lands, so
        // abandoning here costs the customer nothing.
        setClientSecret(secret)
        setSubmitting(false)
        return
      }

      // The cart lives in this browser, so the API cannot empty it — clearing
      // is ours to do, and only once the order actually exists.
      await clearCart()
      router.push(`/checkout/success?order=${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order.')
      setSubmitting(false)
    }
  }

  if (authLoading || !isLoggedIn || cart.items.length === 0) {
    return (
      <div className="pt-[var(--mobile-header-height)] md:pt-0 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Payment step — Stripe's embedded Checkout replaces the shipping form.
  if (clientSecret) {
    return (
      <div className="pt-[var(--mobile-header-height)] md:pt-0 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-display text-4xl font-semibold text-ink mb-2">Payment</h1>
          <p className="text-sm text-muted mb-8">
            Your order is reserved. Complete payment below to confirm it.
          </p>
          <StripeCheckout clientSecret={clientSecret} onCancel={() => setClientSecret(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="pt-[var(--mobile-header-height)] md:pt-0 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-4xl font-semibold text-ink mb-2">Checkout</h1>
        <p className="text-sm text-muted mb-8">
          {paymentMethod === 'whatsapp'
            ? 'Send your selection to us on WhatsApp — we\'ll confirm availability and arrange delivery.'
            : cardPaymentEnabled
              ? 'Pay securely by card, or choose cash on delivery.'
              : 'Cash on delivery — pay when your order arrives.'}
        </p>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-line rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-semibold text-ink mb-5">Shipping Details</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-5">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Full Name" required value={name} onChange={setName} />
                <Field label="Phone"     required value={phone} onChange={setPhone} type="tel" placeholder="+971 XX XXX XXXX" />
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="City" required={paymentMethod !== 'whatsapp'} value={city} onChange={setCity} />
              </div>
              <div className="mt-5">
                <Field label="Street Address" required={paymentMethod !== 'whatsapp'} value={address} onChange={setAddress} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                <Field label="Country" value={country} onChange={setCountry} />
                <Field label="Notes" value={notes} onChange={setNotes} placeholder={paymentMethod === 'whatsapp' ? 'Anything else we should know (optional)' : 'Delivery instructions (optional)'} />
              </div>
            </div>

            <div className="bg-surface border border-line rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-semibold text-ink mb-3">How would you like to order?</h2>
              <div className="space-y-3">
                {cardPaymentEnabled && (
                  <PaymentOption
                    selected={paymentMethod === 'card'}
                    onSelect={() => setPaymentMethod('card')}
                    icon={<CreditCard className="w-4 h-4" />}
                    title="Pay by Card"
                    detail="Card, Apple Pay and Google Pay, secured by Stripe."
                  />
                )}
                <PaymentOption
                  selected={paymentMethod === 'cod'}
                  onSelect={() => setPaymentMethod('cod')}
                  icon={<Truck className="w-4 h-4" />}
                  title="Cash on Delivery"
                  detail="Pay when your order arrives at your door."
                />
                {useWhatsAppInquiry && (
                  <PaymentOption
                    selected={paymentMethod === 'whatsapp'}
                    onSelect={() => setPaymentMethod('whatsapp')}
                    icon={<MessageCircle className="w-4 h-4" />}
                    title="Inquire on WhatsApp"
                    detail="Send us your selection and we confirm availability and price in chat."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-cream rounded-[var(--radius-card)] p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold text-ink mb-4">Your Order</h2>
              <ul className="space-y-3 mb-4 text-sm max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <li key={item.product_id} className="flex justify-between gap-2">
                    <span className="text-muted">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted"> × {item.quantity}</span>
                    </span>
                    {showPrices && (
                      <span className="font-medium whitespace-nowrap">{money(item.price * item.quantity, item.currency)}</span>
                    )}
                  </li>
                ))}
              </ul>
              {showPrices && (
                <>
                  {/* Promo code. Hidden on the WhatsApp path, where the
                      merchant quotes the price in chat and no order exists
                      server-side to discount. */}
                  {paymentMethod !== 'whatsapp' && (
                    <div className="border-t border-line pt-3 mb-3">
                      {applied ? (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs border border-dashed border-gold text-gold rounded px-2 py-0.5">
                              {applied.code}
                            </span>
                            <span className="text-green-700">applied</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => { setApplied(null); setCouponError('') }}
                            className="text-xs text-muted hover:text-gold transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              value={couponInput}
                              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                              // Enter would otherwise submit the whole order.
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                              placeholder="Promo code"
                              className="flex-1 min-w-0 border border-line rounded px-3 py-2 text-sm font-mono bg-surface"
                            />
                            <button
                              type="button"
                              onClick={applyCoupon}
                              disabled={checkingCoupon || couponInput.trim() === ''}
                              className="btn btn--outline px-4 disabled:opacity-50"
                            >
                              {checkingCoupon ? '…' : 'Apply'}
                            </button>
                          </div>
                          {couponError && (
                            <p className="mt-2 text-xs text-red-600">{couponError}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <dl className="space-y-2 text-sm border-t border-line pt-3">
                    <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(cart.subtotal, cart.currency)}</dd></div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <dt>Discount</dt>
                        <dd>-{money(discount, cart.currency)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd className="text-green-700">Free</dd></div>
                  </dl>
                  <div className="border-t border-line pt-3 mt-3 mb-6 flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold text-gold">{money(total, cart.currency)}</span>
                  </div>
                </>
              )}
              {!showPrices && <div className="mb-6" />}
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {paymentMethod === 'card' ? 'Preparing payment…' : 'Placing order…'}
                  </>
                ) : paymentMethod === 'whatsapp' ? (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Inquire on WhatsApp
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {paymentMethod === 'card' ? 'Continue to Payment' : 'Place Order'}
                  </>
                )}
              </button>
              <Link href="/cart" className="block text-center text-sm text-muted mt-4 hover:text-gold transition-colors">
                Back to cart
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted mb-1.5">
        {props.label}{props.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={props.type || 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        placeholder={props.placeholder}
        className="w-full border border-line rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
      />
    </div>
  )
}

/**
 * A selectable payment method row. A real radio input drives it so keyboard
 * and screen-reader behaviour comes for free — the styling hangs off
 * `selected` rather than replacing the control with a div.
 */
function PaymentOption(props: {
  selected: boolean
  onSelect: () => void
  icon:     React.ReactNode
  title:    string
  detail:   string
}) {
  const { selected, onSelect, icon, title, detail } = props
  return (
    <label
      className={`flex items-start gap-3 p-4 border rounded-[var(--radius-card)] cursor-pointer transition-colors ${
        selected ? 'border-gold bg-surface-2/50' : 'border-line hover:border-gold/50'
      }`}
    >
      <input
        type="radio"
        name="payment"
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 accent-gold"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {icon}
          {title}
        </span>
        <span className="block text-xs text-muted mt-0.5">{detail}</span>
      </span>
    </label>
  )
}
