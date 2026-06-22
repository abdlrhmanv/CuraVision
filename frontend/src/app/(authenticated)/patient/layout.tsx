'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import {
  Activity,
  Brain,
  Calendar,
  FileText,
  MessageSquare,
  Newspaper,
  Settings,
  User,
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { PortalMobileNav, PortalSidebar } from '@/components/layout/PortalNav'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const navItems = [
  { label: 'Dashboard', href: '/patient', icon: Activity },
  { label: 'Chatbot', href: '/patient/chatbot', icon: MessageSquare },
  { label: 'My Scans', href: '/patient/scans', icon: Brain },
  { label: 'Reports', href: '/patient/reports', icon: FileText },
  { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
  { label: 'Articles', href: '/patient/articles', icon: Newspaper },
  { label: 'Profile', href: '/patient/profile', icon: User },
  { label: 'Settings', href: '/patient/settings', icon: Settings },
]

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth('PATIENT')

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-sm text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="h-[60px] border-b border-border bg-bg/95 backdrop-blur-sm px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/patient" className="text-lg font-extrabold tracking-tight">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent hidden sm:block">
            Patient Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center hover:border-accent transition"
            aria-label="Notifications"
          >
            <Bell size={16} className="text-muted" />
            <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-warn border-2 border-bg" />
          </button>
          <div className="text-xs text-muted hidden sm:block">{user.full_name}</div>
          <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">
            {initials(user.full_name)}
          </div>
        </div>
      </header>

      <PortalMobileNav navItems={navItems} accent="accent" />

      <div className="flex flex-1 min-h-0">
        <PortalSidebar
          user={user}
          portalLabel="Patient Portal"
          accent="accent"
          navItems={navItems}
        />
        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
