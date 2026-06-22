'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';
import { AuthUser, clearSession } from '@/lib/apiClient';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  user: AuthUser;
  navItems: NavItem[];
}

export function Sidebar({ user, navItems }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold tracking-tight">CuraVision</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="mb-4 px-4 py-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400">Logged in as</p>
          <p className="text-sm font-semibold text-white truncate">
            {user.full_name}
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
