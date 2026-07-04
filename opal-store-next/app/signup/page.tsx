import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AuthFormShell from '@/components/AuthFormShell'
import { authDisabled } from '@/lib/config'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create an Opal Perfumes account to track orders and shop faster.',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  if (authDisabled) redirect('/')
  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Track orders, save shipping details, shop faster."
      altText="Already have an account?"
      altLabel="Sign in"
      altHref="/login"
    >
      {/* Suspense required because SignupForm calls useSearchParams(). */}
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthFormShell>
  )
}
