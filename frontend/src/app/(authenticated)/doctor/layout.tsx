'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Bell } from 'lucide-react'
import Sidebar from '@/components/layout/sidebar'
import { useRequireAuth } from '@/lib/authContext'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [collapsed, setCollapsed] = useState(false)

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-sm text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="h-[60px] border-b border-border bg-bg/95 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-muted hover:text-white hover:border-blue transition-all duration-200"
          >
            <Menu size={16} />
          </button>
          <Link href="/doctor" className="text-lg font-extrabold tracking-tight">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 text-blue hidden sm:block">
            Doctor Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center hover:border-blue transition">
            <Bell size={16} className="text-muted" />
          </button>
          <div className="text-xs text-muted hidden sm:block">{user.full_name}</div>
          <div className="w-9 h-9 rounded-lg bg-blue/15 text-blue text-xs font-bold flex items-center justify-center">
            {initials(user.full_name)}
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-60px)]">
        <Sidebar role="doctor" collapsed={collapsed} />
        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
