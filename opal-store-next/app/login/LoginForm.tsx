'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { useCart } from '@/components/CartProvider'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuth()
  const { refresh: refreshCart } = useCart()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      await refreshCart()
      const next = params.get('next') || '/account'
      router.push(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent" />
      </div>
      <button type="submit" disabled={submitting}
        className="w-full bg-gold text-white py-3 px-8 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors disabled:opacity-60">
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
