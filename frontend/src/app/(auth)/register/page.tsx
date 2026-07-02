'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { ApiError } from '@/lib/apiClient'
import { showError, showLoading, closeLoading } from '@/lib/sweetAlert'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      await register({
        email,
        password,
        full_name: fullName,
        role: role === 'doctor' ? 'DOCTOR' : 'PATIENT',
      })
      closeLoading()
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
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
              id="firstName"
              name="given-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
              placeholder={role === 'doctor' ? 'John' : ''}
            />
          </div>
          <div>
            <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Last name</label>
            <input
              id="lastName"
              name="family-name"
              type="text"
              autoComplete="family-name"
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
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            placeholder={role === 'doctor' ? 'john.doe@hospital.com' : 'you@example.com'}
          />
        </div>

        <div className="mt-3.5">
          <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="w-full pl-4 pr-10 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition text-text"
              placeholder="At least 8 characters"
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
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Password strength:</span>
                <span className={`font-semibold ${
                  getPasswordStrength(password) === 'Strong' ? 'text-accent' : getPasswordStrength(password) === 'Medium' ? 'text-[#ffc107]' : 'text-red-500'
                }`}>
                  {getPasswordStrength(password)}
                </span>
              </div>
              <div className="h-1 w-full bg-border rounded-full overflow-hidden flex gap-0.5">
                <div className={`h-full transition-all duration-300 ${
                  getPasswordStrength(password) === 'Strong'
                    ? 'w-full bg-accent'
                    : getPasswordStrength(password) === 'Medium'
                    ? 'w-2/3 bg-[#ffc107]'
                    : 'w-1/3 bg-red-500'
                }`} />
              </div>
            </div>
          )}
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

function getPasswordStrength(pass: string): 'Weak' | 'Medium' | 'Strong' | '' {
  if (!pass) return ''
  let score = 0
  if (pass.length >= 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[a-z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  if (/[^A-Za-z0-9]/.test(pass)) score++

  if (score <= 2) return 'Weak'
  if (score <= 4) return 'Medium'
  return 'Strong'
}
