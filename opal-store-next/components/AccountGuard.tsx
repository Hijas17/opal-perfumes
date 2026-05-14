'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'

/**
 * Wraps account-area pages. Redirects unauthenticated users to /login
 * with a `next` parameter pointing back to the protected URL.
 */
export default function AccountGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [isLoggedIn, loading, pathname, router])

  if (loading || !isLoggedIn) {
    return (
      <div className="pt-[70px] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
