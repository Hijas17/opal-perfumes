'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'
import { placeOrder } from '@/lib/customer-api'
import { formatPrice } from '@/lib/format'

export default function CheckoutForm() {
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

    for (const [val, label] of [[name, 'Name'], [phone, 'Phone'], [address, 'Address'], [city, 'City']]) {
      if (!val.trim()) { setError(`${label} is required.`); return }
    }

    setSubmitting(true)
    try {
      const order = await placeOrder({
        shipping: {
          name:    name.trim(),
          phone:   phone.trim(),
          email:   email.trim(),
          address: address.trim(),
          city:    city.trim(),
          country: country.trim(),
          notes:   notes.trim(),
        },
        payment_method: 'cod',
      })
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
        <p className="text-sm text-gray-500 mb-8">Cash on delivery — pay when your order arrives.</p>

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
                <Field label="City" required value={city} onChange={setCity} />
              </div>
              <div className="mt-5">
                <Field label="Street Address" required value={address} onChange={setAddress} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                <Field label="Country" value={country} onChange={setCountry} />
                <Field label="Notes" value={notes} onChange={setNotes} placeholder="Delivery instructions (optional)" />
              </div>
            </div>

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
                    <span className="font-medium whitespace-nowrap">{formatPrice(item.price * item.quantity, item.currency)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-2 text-sm border-t border-gray-200 pt-3">
                <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{formatPrice(cart.subtotal, cart.currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Shipping</dt><dd className="text-green-700">Free</dd></div>
              </dl>
              <div className="border-t border-gray-200 pt-3 mt-3 mb-6 flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-gold">{formatPrice(cart.subtotal, cart.currency)}</span>
              </div>
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
