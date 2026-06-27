'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Lock, MessageCircle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'
import { placeOrder } from '@/lib/customer-api'
import { formatPrice } from '@/lib/format'
import {
  buildWhatsAppUrl,
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
  const router = useRouter()
  const { customer, isLoggedIn, loading: authLoading } = useAuth()
  const { cart, refresh: refreshCart } = useCart()

  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [email,   setEmail]   = useState('')
  const [address, setAddress] = useState('')
  const [city,    setCity]    = useState('Dubai')
  const [country, setCountry] = useState('UAE')
  const [notes,   setNotes]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState('')

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

    // In inquiry mode the address fields are optional — only name + phone are required
    // so the merchant can call back to confirm the rest in WhatsApp.
    const required: [string, string][] = useWhatsAppInquiry
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

    if (useWhatsAppInquiry) {
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
      const order = await placeOrder({ shipping, payment_method: 'cod' })
      await refreshCart()
      router.push(`/checkout/success?order=${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order.')
      setSubmitting(false)
    }
  }

  if (authLoading || !isLoggedIn || cart.items.length === 0) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pt-[70px] min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-4xl font-semibold text-[#1a1a1a] mb-2">Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">
          {useWhatsAppInquiry
            ? 'Send your selection to us on WhatsApp — we\'ll confirm availability and arrange delivery.'
            : 'Cash on delivery — pay when your order arrives.'}
        </p>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-semibold text-[#1a1a1a] mb-5">Shipping Details</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-5">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Full Name" required value={name} onChange={setName} />
                <Field label="Phone"     required value={phone} onChange={setPhone} type="tel" placeholder="+971 XX XXX XXXX" />
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="City" required={!useWhatsAppInquiry} value={city} onChange={setCity} />
              </div>
              <div className="mt-5">
                <Field label="Street Address" required={!useWhatsAppInquiry} value={address} onChange={setAddress} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                <Field label="Country" value={country} onChange={setCountry} />
                <Field label="Notes" value={notes} onChange={setNotes} placeholder={useWhatsAppInquiry ? 'Anything else we should know (optional)' : 'Delivery instructions (optional)'} />
              </div>
            </div>

            {!useWhatsAppInquiry && (
              <div className="bg-white border border-gray-100 rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]">
                <h2 className="font-display text-xl font-semibold text-[#1a1a1a] mb-3">Payment Method</h2>
                <label className="flex items-start gap-3 p-4 border border-gold rounded-[var(--radius-card)] bg-amber-50/50">
                  <input type="radio" name="payment" checked readOnly className="mt-0.5 accent-gold" />
                  <span>
                    <span className="block text-sm font-medium text-[#1a1a1a]">Cash on Delivery</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Pay when your order arrives at your door.</span>
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-cream rounded-[var(--radius-card)] p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold text-[#1a1a1a] mb-4">Your Order</h2>
              <ul className="space-y-3 mb-4 text-sm max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <li key={item.product_id} className="flex justify-between gap-2">
                    <span className="text-gray-700">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-500"> × {item.quantity}</span>
                    </span>
                    {showPrices && (
                      <span className="font-medium whitespace-nowrap">{formatPrice(item.price * item.quantity, item.currency)}</span>
                    )}
                  </li>
                ))}
              </ul>
              {showPrices && (
                <>
                  <dl className="space-y-2 text-sm border-t border-gray-200 pt-3">
                    <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{formatPrice(cart.subtotal, cart.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-600">Shipping</dt><dd className="text-green-700">Free</dd></div>
                  </dl>
                  <div className="border-t border-gray-200 pt-3 mt-3 mb-6 flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold text-gold">{formatPrice(cart.subtotal, cart.currency)}</span>
                  </div>
                </>
              )}
              {!showPrices && <div className="mb-6" />}
              {useWhatsAppInquiry ? (
                <button type="submit"
                  className="w-full bg-[#25D366] text-white py-3.5 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#1ebd5b] transition-colors flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Inquire on WhatsApp
                </button>
              ) : (
                <button type="submit" disabled={submitting}
                  className="w-full bg-gold text-white py-3.5 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing order…
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Place Order
                    </>
                  )}
                </button>
              )}
              <Link href="/cart" className="block text-center text-sm text-gray-500 mt-4 hover:text-gold transition-colors">
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {props.label}{props.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={props.type || 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        placeholder={props.placeholder}
        className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
      />
    </div>
  )
}
