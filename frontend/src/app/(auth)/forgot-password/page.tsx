'use client'

import { useState } from 'react'
import Link from 'next/link'
import { showSuccess, showLoading, closeLoading } from '@/lib/sweetAlert'
import { authApi, ApiError } from '@/lib/apiClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Email is required')
      return
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setError(null)
    setIsLoading(true)
    showLoading('Requesting reset link...')

    try {
      await authApi.forgotPassword(email)
      closeLoading()
      showSuccess('Reset Link Sent', 'If the email exists, a reset link has been sent. Please check your inbox.')
      setEmail('')
    } catch (err) {
      closeLoading()
      setError(err instanceof ApiError ? err.message : 'Failed to request password reset.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[420px] bg-[radial-gradient(ellipse,rgba(0,198,184,0.08),transparent_65%)] pointer-events-none" />

      <div className="bg-card border border-border rounded-xl p-6 md:p-10 w-full max-w-[500px] relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-extrabold tracking-tight inline-block">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <h1 className="text-3xl font-extrabold mt-3">Forgot Password</h1>
          <p className="text-sm text-muted mt-1">Enter your email to receive a password reset link</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Email Address</label>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              type="email"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition text-text"
              placeholder="your@email.com"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center text-xs text-muted mt-6">
          Back to{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
