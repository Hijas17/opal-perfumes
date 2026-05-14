'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import {
  customerLogin, customerLogout, customerRegister,
  fetchMe, getToken,
} from '@/lib/customer-api'
import type { Customer } from '@/lib/types'

interface AuthContextValue {
  customer:  Customer | null
  loading:   boolean
  isLoggedIn: boolean
  login:     (email: string, password: string) => Promise<void>
  register:  (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>
  logout:    () => Promise<void>
  refresh:   () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading,  setLoading]  = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setCustomer(null)
      setLoading(false)
      return
    }
    try {
      const me = await fetchMe()
      setCustomer(me)
    } catch {
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const r = await customerLogin(email, password)
    setCustomer(r.customer)
  }, [])

  const register = useCallback(async (input: { name: string; email: string; password: string; phone?: string }) => {
    const r = await customerRegister(input)
    setCustomer(r.customer)
  }, [])

  const logout = useCallback(async () => {
    await customerLogout()
    setCustomer(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      customer, loading,
      isLoggedIn: !!customer,
      login, register, logout, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
