'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitInquiry } from '@/lib/api'

interface FormState {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  honeypot: string
}

export default function ContactForm() {
  const searchParams = useSearchParams()
  const productSubject = searchParams.get('product')

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    subject: productSubject ? `Inquiry about: ${productSubject}` : '',
    message: '',
    honeypot: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.honeypot) return  // spam trap

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      await submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      })
      setSuccess(true)
      setForm({ name: '', email: '', phone: '', subject: '', message: '', honeypot: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display text-2xl font-semibold text-[#1a1a1a] mb-2">Message Sent!</h3>
        <p className="text-gray-500 mb-6">Thank you for reaching out. We&rsquo;ll get back to you as soon as possible.</p>
        <button type="button" onClick={() => setSuccess(false)} className="text-gold text-sm font-medium hover:underline">
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h3 className="font-display text-xl font-semibold text-[#1a1a1a] mb-6">Send us a message</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-5">{error}</div>
      )}

      {/* Honeypot */}
      <input
        type="text" name="honeypot" value={form.honeypot} onChange={handleChange}
        className="hidden" tabIndex={-1} autoComplete="off"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required
            className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors duration-200" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required
            className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors duration-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+971 XX XXX XXXX"
            className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors duration-200" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <input type="text" name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?"
            className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors duration-200" />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
        <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us about your inquiry..." required
          className="w-full border border-gray-300 rounded px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors duration-200 resize-none" />
      </div>

      <button type="submit" disabled={submitting}
        className="w-full bg-gold text-white py-3.5 px-8 text-sm font-medium tracking-wider uppercase rounded-[var(--radius-btn)] hover:bg-[#8a6420] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed">
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          'Send Message'
        )}
      </button>
    </form>
  )
}
