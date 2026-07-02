'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { showSuccess, showLoading, closeLoading } from '@/lib/sweetAlert'
import { authApi, ApiError } from '@/lib/apiClient'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setError('Reset token is missing or invalid. Please request a new password reset link.')
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    setIsLoading(true)
    showLoading('Resetting password...')

    try {
      await authApi.resetPassword(token, password)
      closeLoading()
      showSuccess('Password Reset Success', 'Your password has been successfully reset. You will be redirected to the login page.')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err) {
      closeLoading()
      setError(err instanceof ApiError ? err.message : 'Failed to reset password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-10 w-full max-w-[500px] relative z-10">
      <div className="text-center mb-8">
        <Link href="/" className="text-xl font-extrabold tracking-tight inline-block">
          Cura<span className="text-accent">Vision</span>
        </Link>
        <h1 className="text-3xl font-extrabold mt-3">Reset Password</h1>
        <p className="text-sm text-muted mt-1">Enter your new password below</p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-500">
          {error}
        </div>
      )}

      {!token ? (
        <div className="text-center">
          <p className="text-sm text-muted mb-6">Verification link is invalid or expired. Please request a new password reset link.</p>
          <Link
            href="/forgot-password"
            className="block w-full py-3 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition text-center"
          >
            Go to Forgot Password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">New Password</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-4 pr-10 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition text-text"
                placeholder="At least 8 characters"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition focus:outline-none bg-transparent border-0 cursor-pointer"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (error) setError(null)
                }}
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full pl-4 pr-10 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition text-text"
                placeholder="Confirm new password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition focus:outline-none bg-transparent border-0 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition disabled:opacity-50 mt-6"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-muted mt-6">
        Back to{' '}
        <Link href="/login" className="text-accent font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[420px] bg-[radial-gradient(ellipse,rgba(0,198,184,0.08),transparent_65%)] pointer-events-none" />

      <Suspense fallback={<div className="text-muted">Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  )
}
