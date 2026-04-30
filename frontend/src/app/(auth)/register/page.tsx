'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { ApiError } from '@/lib/apiClient'
import { showError, showSuccess, showLoading, closeLoading } from '@/lib/sweetAlert'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    if (!fullName || !email || !password) {
      showError('Missing fields', 'Name, email, and password are required.')
      return
    }
    if (password.length < 8) {
      showError('Weak password', 'Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    showLoading('Creating your account...')

    try {
      const user = await register({
        email,
        password,
        full_name: fullName,
        role: role === 'doctor' ? 'DOCTOR' : 'PATIENT',
      })
      closeLoading()
      showSuccess('Account created', `Welcome, ${user.full_name}!`)
      setTimeout(() => {
        router.push(user.role === 'DOCTOR' ? '/doctor' : '/patient')
      }, 900)
    } catch (err) {
      closeLoading()
      setIsLoading(false)
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to reach the backend. Is it running on port 3001?'
      showError('Registration failed', message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[420px] bg-[radial-gradient(ellipse,rgba(0,198,184,0.08),transparent_65%)] pointer-events-none" />

      <div className="bg-card border border-border rounded-xl p-6 md:p-8 w-full max-w-[650px] relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-7">
          <Link href="/" className="text-xl font-extrabold tracking-tight inline-block">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-3">Create your account</h1>
          <p className="text-sm text-muted mt-1">Join CuraVision as a patient or doctor</p>
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

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
              placeholder={role === 'doctor' ? 'John' : ''}
            />
          </div>
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
              placeholder={role === 'doctor' ? 'Doe' : ''}
            />
          </div>
        </div>

        <div className="mt-3.5">
          <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Email address</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            placeholder={role === 'doctor' ? 'john.doe@hospital.com' : 'you@example.com'}
          />
        </div>

        <div className="mt-3.5">
          <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            placeholder="At least 8 characters"
          />
        </div>

        <div className="mt-4 p-3.5 rounded-lg bg-surface/50 border border-border">
          <p className="text-xs text-muted">
            Additional profile fields (medical history, license number, etc.) will be
            collected after sign-up once the backend profile endpoints are live.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`w-full py-3.5 rounded-lg text-sm font-bold transition mt-6 ${
            role === 'patient' ? 'bg-accent text-[#050B18] hover:bg-[#00ddd4]' : 'bg-blue text-[#050B18] hover:bg-[#6fa0ff]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? 'Creating...' : `Create ${role === 'patient' ? 'Patient' : 'Doctor'} Account`}
        </button>

        <div className="text-center text-xs text-muted mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
