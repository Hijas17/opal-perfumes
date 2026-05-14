import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { Label } from '../components/ui/label.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f5ede0 0%, #efe0c8 50%, #e8d4b4 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
          {/* Gold header bar */}
          <div className="h-2 bg-gold" />

          <div className="p-8">
            {/* Logo / Title */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">O</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Opal Admin</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to manage your store</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="admin@opalperfumes.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full py-2.5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Opal Perfumes Admin Portal &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
