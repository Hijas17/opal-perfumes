'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'

export default function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { register } = useAuth()
  const { refresh: refreshCart } = useCart()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password })
      await refreshCart()
      const next = params.get('next') || '/account'
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 text-xs">(optional)</span></label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-gray-400 text-xs">(min 6 chars)</span></label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <button type="submit" disabled={submitting}
        className="w-full bg-gold text-white py-3 px-8 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors disabled:opacity-60">
        {submitting ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}
