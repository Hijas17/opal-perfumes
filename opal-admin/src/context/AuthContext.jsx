import React, { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('opal_token')
    const storedAdmin = localStorage.getItem('opal_admin')
    if (storedToken && storedAdmin) {
      try {
        setToken(storedToken)
        setAdmin(JSON.parse(storedAdmin))
      } catch {
        localStorage.removeItem('opal_token')
        localStorage.removeItem('opal_admin')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await apiLogin(email, password)
    const { token: newToken, admin: adminData } = response.data
    localStorage.setItem('opal_token', newToken)
    localStorage.setItem('opal_admin', JSON.stringify(adminData))
    setToken(newToken)
    setAdmin(adminData)
    return response
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // ignore errors on logout
    } finally {
      localStorage.removeItem('opal_token')
      localStorage.removeItem('opal_admin')
      setToken(null)
      setAdmin(null)
    }
  }

  const isAuthenticated = !!token && !!admin

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
