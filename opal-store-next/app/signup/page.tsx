import type { Metadata } from 'next'
import AuthFormShell from '@/components/AuthFormShell'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create an Opal Perfumes account to track orders and shop faster.',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Track orders, save shipping details, shop faster."
      altText="Already have an account?"
      altLabel="Sign in"
      altHref="/login"
    >
      <SignupForm />
    </AuthFormShell>
  )
}
