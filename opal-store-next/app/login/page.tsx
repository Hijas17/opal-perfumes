import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AuthFormShell from '@/components/AuthFormShell'
import { authDisabled } from '@/lib/config'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Opal Perfumes account.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  if (authDisabled) redirect('/')
  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Sign in to continue."
      altText="New to Opal Perfumes?"
      altLabel="Create an account"
      altHref="/signup"
    >
      {/* Suspense required because LoginForm calls useSearchParams(),
          which suspends during static prerendering. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthFormShell>
  )
}
