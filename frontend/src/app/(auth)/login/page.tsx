'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { showSuccess, showError, showLoading, closeLoading } from '@/lib/sweetAlert'
import { useAuth } from '@/lib/authContext'
import { ApiError } from '@/lib/apiClient'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Missing Fields', 'Please enter both email and password')
      return
    }

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
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to reach the backend. Is it running on port 3001?'
      showError('Sign-in failed', message)
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition"
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              type="password"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-5 mb-6 p-3.5 rounded-lg bg-surface/50 border border-border">
          <p className="text-xs text-muted text-center">
            Seeded demo accounts: <span className="text-text font-semibold">patient1@curavision.com</span> /{' '}
            <span className="text-text font-semibold">Patient@123</span>
            <br />
            <span className="text-text font-semibold">doctor@curavision.com</span> /{' '}
            <span className="text-text font-semibold">Doctor@123</span>
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-sm font-bold transition ${
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
      </div>
    </div>
  )
}
