'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { showSuccess, showError, showLoading, closeLoading } from '@/lib/sweetAlert'

const STATIC_PATIENT_USER = {
  email: 'omar',
  password: '123',
}

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (role !== 'patient') {
      showError('Login Unavailable', 'Static login is currently available for patient role only.')
      return
    }

    if (!email || !password) {
      showError('Missing Fields', 'Please enter both email and password')
      return
    }

    setIsLoading(true)
    showLoading('Signing in...')

    // Simulate slight delay for better UX
    setTimeout(() => {
      if (email === STATIC_PATIENT_USER.email && password === STATIC_PATIENT_USER.password) {
        localStorage.setItem('curavision_demo_user', JSON.stringify({ role: 'patient', email }))
        closeLoading()
        setIsLoading(false)
        
        showSuccess('Welcome back!', `Successfully signed in as ${email}`)
        
        setTimeout(() => {
          router.push('/patient')
        }, 1500)
      } else {
        closeLoading()
        setIsLoading(false)
        showError('Invalid Credentials', 'Please use the demo patient account: omar / 123')
      }
    }, 1000)
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
              type="password" 
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-5 mb-6 p-3.5 rounded-lg bg-surface/50 border border-border">
          <p className="text-xs text-muted text-center">
            Demo patient login: <span className="text-text font-semibold">omar</span> / <span className="text-text font-semibold">123</span>
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