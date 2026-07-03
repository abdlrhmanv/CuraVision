'use client'

import Link from 'next/link'
import {
  Activity,
  Brain,
  Calendar,
  CalendarClock,
  Upload,
  User,
  Users,
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { PortalMobileNav, PortalSidebar } from '@/components/layout/PortalNav'
import { NotificationDropdown } from '@/components/layout/NotificationDropdown'

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
  { label: 'Dashboard', href: '/doctor', icon: Activity },
  { label: 'Upload Scan', href: '/doctor/upload', icon: Upload },
  { label: 'All Scans', href: '/doctor/scans', icon: Brain },
  { label: 'Patients', href: '/doctor/patients', icon: Users },
  { label: 'Appointments', href: '/doctor/appointments', icon: Calendar },
  { label: 'Availability', href: '/doctor/availability', icon: CalendarClock },
  { label: 'Profile', href: '/doctor/profile', icon: User },
]

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth('DOCTOR')

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
          <Link href="/doctor" className="text-lg font-extrabold tracking-tight">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 text-blue hidden sm:block">
            Doctor Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <div className="text-xs text-muted hidden sm:block">{user.full_name}</div>
          <div className="w-9 h-9 rounded-lg bg-blue/15 text-blue text-xs font-bold flex items-center justify-center">
            {initials(user.full_name)}
          </div>
        </div>
      </header>

      <PortalMobileNav navItems={navItems} accent="blue" />

      <div className="flex flex-1 min-h-0">
        <PortalSidebar
          user={user}
          portalLabel="Doctor Portal"
          accent="blue"
          navItems={navItems}
        />
        <main className="flex-1 p-5 md:p-8 lg:p-10 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
