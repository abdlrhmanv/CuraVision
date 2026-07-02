'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div className="bg-card border border-border rounded-xl p-6 md:p-10 w-full max-w-[500px] relative z-10 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center text-accent">
          <Mail className="w-8 h-8" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold mb-3">Verify your email</h1>
      <p className="text-sm text-muted mb-6">
        We have sent a verification link to <strong className="text-white">{email}</strong>.
      </p>

      <div className="bg-surface/50 border border-border rounded-lg p-4 mb-8 text-left text-xs text-muted leading-relaxed">
        <p className="font-semibold text-text mb-1 text-accent">Important:</p>
        <p>You cannot log in to your account until your email address is verified. Please click the verification link inside the email to activate your account.</p>
      </div>

      <Link
        href="/login"
        className="block w-full py-3 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition text-center"
      >
        Go to Sign in
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[420px] bg-[radial-gradient(ellipse,rgba(0,198,184,0.08),transparent_65%)] pointer-events-none" />
      
      <Suspense fallback={<div className="text-muted">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
