'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/audit-logs');
  }, [router]);

  return <div className="flex justify-center items-center h-64 text-gray-500">Redirecting...</div>;
}
