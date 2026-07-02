'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { showSuccess, showError, showLoading, closeLoading } from '@/lib/sweetAlert'
import { useAuth } from '@/lib/authContext'
import { ApiError } from '@/lib/apiClient'

function QueryParamsHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      showSuccess('Email Verified', 'Your email has been verified successfully. You can now sign in.')
      router.replace('/login')
    } else if (searchParams.get('expired') === 'true') {
      showError('Session Expired', 'Your session has expired. Please sign in again.')
      router.replace('/login')
    }
  }, [searchParams, router])

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email address.'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    }

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    setIsLoading(true)
    showLoading('Signing in...')

    try {
      const user = await login(email, password)
      closeLoading()

      const expectedRole = role === 'doctor' ? 'DOCTOR' : 'PATIENT'
      if (user.role !== expectedRole && user.role !== 'ADMIN') {
        showError(
          'Role mismatch',
          `This account is registered as a ${user.role}. Please switch the role tab and try again.`
        )
        setIsLoading(false)
        return
      }

      showSuccess('Welcome back!', `Signed in as ${user.full_name}`)

      setTimeout(() => {
        if (user.role === 'DOCTOR') router.push('/doctor')
        else if (user.role === 'ADMIN') router.push('/admin')
        else router.push('/patient')
      }, 900)
    } catch (err) {
      closeLoading()
      setIsLoading(false)
      
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
        const validationErrors: { email?: string; password?: string } = {}
        const details = err.details as Array<{ path: string; msg: string }>
        details.forEach((e) => {
          if (e.path === 'email') {
            validationErrors.email = 'Please enter a valid email address.'
          } else if (e.path === 'password') {
            validationErrors.password = e.msg
          }
        })
        setErrors(validationErrors)
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Unable to reach the backend. Is it running on port 3001?'
        showError('Sign-in failed', message)
      }
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
          <h1 className="text-3xl font-extrabold mt-3">Welcome back</h1>
          <p className="text-sm text-muted mt-1">Sign in to your account</p>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-surface border border-border rounded-lg p-1 mb-6">
          <button
            onClick={() => setRole('patient')}
            className={`py-2.5 text-center text-sm font-semibold rounded-md transition ${
              role === 'patient' ? 'bg-accent text-[#050B18]' : 'text-muted hover:text-white'
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => setRole('doctor')}
            className={`py-2.5 text-center text-sm font-semibold rounded-md transition ${
              role === 'doctor' ? 'bg-blue text-[#050B18]' : 'text-muted hover:text-white'
            }`}
          >
            Doctor
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: undefined })
              }}
              type="email"
              className={`w-full px-4 py-3 bg-surface border rounded-lg text-sm focus:outline-none transition ${
                errors.email ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
              }`}
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-accent hover:underline bg-transparent border-0 cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                type={showPassword ? 'text' : 'password'}
                className={`w-full pl-4 pr-10 py-3 bg-surface border rounded-lg text-sm focus:outline-none transition ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-accent'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
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
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
        </div>



        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-sm font-bold transition mt-6 ${
            role === 'patient'
              ? 'bg-accent text-[#050B18] hover:bg-[#00ddd4]'
              : 'bg-blue text-[#050B18] hover:bg-[#6fa0ff]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Signing in...' : `Sign in as ${role === 'patient' ? 'Patient' : 'Doctor'}`}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted">new to CuraVision?</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="text-center text-xs text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Create one
          </Link>
        </div>
        <Suspense fallback={null}>
          <QueryParamsHandler />
        </Suspense>
      </div>
    </div>
  )
}
