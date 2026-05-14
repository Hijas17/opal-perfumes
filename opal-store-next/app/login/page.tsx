import type { Metadata } from 'next'
import AuthFormShell from '@/components/AuthFormShell'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Opal Perfumes account.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Sign in to continue."
      altText="New to Opal Perfumes?"
      altLabel="Create an account"
      altHref="/signup"
    >
      <LoginForm />
    </AuthFormShell>
  )
}
