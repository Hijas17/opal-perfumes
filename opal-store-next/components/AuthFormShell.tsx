/**
 * Shared visual shell for login + signup pages. Server component — accepts
 * arbitrary children (the actual form is a client component).
 */
import Link from 'next/link'
import { ReactNode } from 'react'

interface Props {
  title:    string
  subtitle: string
  altText:  string
  altLabel: string
  altHref:  string
  children: ReactNode
}

export default function AuthFormShell({ title, subtitle, altText, altLabel, altHref, children }: Props) {
  return (
    <div className="pt-[70px] min-h-screen bg-cream">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Link href="/" className="font-display italic text-3xl text-gold">Opal Perfumes</Link>
        </div>

        <div className="bg-white rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-8">
          <h1 className="font-display text-3xl font-semibold text-[#1a1a1a] mb-2">{title}</h1>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
          {children}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {altText}{' '}
          <Link href={altHref} className="text-gold font-medium hover:underline">{altLabel}</Link>
        </p>
      </div>
    </div>
  )
}
