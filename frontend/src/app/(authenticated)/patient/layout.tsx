'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Bell, User } from 'lucide-react'
import Sidebar from '@/components/layout/sidebar'

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="h-[60px] border-b border-border bg-bg/95 backdrop-blur-sm px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-muted hover:text-white hover:border-accent transition-all duration-200"
          >
            <Menu size={16} />
          </button>
          <Link href="/patient/dashboard" className="text-lg font-extrabold tracking-tight">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent hidden sm:block">Patient Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center hover:border-accent transition">
            <Bell size={16} className="text-muted" />
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-warn border-2 border-bg" />
          </button>
          <div className="text-xs text-muted hidden sm:block">Omar Tarek</div>
          <button className="w-9 h-9 rounded-lg bg-accent/15 text-accent text-xs font-bold flex items-center justify-center hover:bg-accent/25 transition">
            OT
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-60px)]">
        <Sidebar role="patient" collapsed={collapsed} />
        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}