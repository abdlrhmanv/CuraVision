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

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function PortalMobileNav({ navItems, accent }: Pick<PortalNavProps, 'navItems' | 'accent'>) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { logout } = useAuth()

  const activeClass =
    accent === 'accent'
      ? 'bg-accent/15 text-accent border-accent/30'
      : 'bg-blue/15 text-blue border-blue/30'

  return (
    <>
      <div className="md:hidden flex items-center justify-end px-4 py-2 border-b border-border bg-card">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 border border-border rounded-md hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true" 
          />
          <div className="relative w-64 bg-card h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-sm uppercase tracking-wide">Menu</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium border transition ${
                      active
                        ? activeClass
                        : 'text-muted border-transparent hover:text-foreground hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium text-muted border border-border hover:border-warn/40 hover:text-warn transition"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
