'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { AuthUser, clearSession } from '@/lib/apiClient';

interface TopNavProps {
  user: AuthUser;
}

export function TopNav({ user }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    clearSession();
    router.push('/');
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">
        Welcome back, <span className="font-semibold text-gray-900">{user.full_name}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/system')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Settings"
        >
          <Settings size={18} className="text-gray-600" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 text-sm"
        >
          <LogOut size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
