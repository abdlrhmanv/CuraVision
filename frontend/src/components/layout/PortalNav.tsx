'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LucideIcon } from 'lucide-react'
import { AuthUser } from '@/lib/apiClient'
import { useAuth } from '@/lib/authContext'

export interface PortalNavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface PortalNavProps {
  user: AuthUser
  portalLabel: string
  accent: 'accent' | 'blue'
  navItems: PortalNavItem[]
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/patient' || href === '/doctor' || href === '/admin') {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PortalSidebar({ user, portalLabel, accent, navItems }: PortalNavProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const activeClass =
    accent === 'accent'
      ? 'bg-accent/15 text-accent border-accent/30'
      : 'bg-blue/15 text-blue border-blue/30'

  const hoverClass =
    accent === 'accent'
      ? 'hover:border-accent/40 hover:text-accent'
      : 'hover:border-blue/40 hover:text-blue'

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="px-4 py-5 border-b border-border">
        <p className="text-[10px] tracking-[2px] uppercase text-muted font-semibold">
          {portalLabel}
        </p>
        <p className="text-sm font-semibold mt-1 truncate">{user.full_name}</p>
        <p className="text-xs text-muted truncate">{user.email}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-transparent transition ${
                active
                  ? activeClass
                  : `text-muted ${hoverClass}`
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted border border-border hover:border-warn/40 hover:text-warn transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export function PortalMobileNav({ navItems, accent }: Pick<PortalNavProps, 'navItems' | 'accent'>) {
  const pathname = usePathname()

  const activeClass =
    accent === 'accent'
      ? 'bg-accent/15 text-accent border-accent/30'
      : 'bg-blue/15 text-blue border-blue/30'

  return (
    <nav className="md:hidden border-b border-border bg-card/30 px-3 py-2 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition ${
                active
                  ? activeClass
                  : 'text-muted border-transparent hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
