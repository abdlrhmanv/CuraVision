'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DoctorReportRedirect({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function checkReport() {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token');
        
        // This endpoint doesn't exist explicitly for doctors to get by report ID,
        // but we just ping the corrections endpoint or anything to see if it exists.
        const res = await fetch(`http://localhost:3001/api/reports/${params.id}/corrections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          setError(true);
          setTimeout(() => router.push('/doctor'), 2000);
        } else {
          // It exists, but direct navigation is unsupported in this app structure.
          setError(true);
          setTimeout(() => router.push('/doctor'), 2000);
        }
      } catch {
        setError(true);
        setTimeout(() => router.push('/doctor'), 2000);
      }
    }
    checkReport();
  }, [params.id, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      {error ? (
        <>
          <h2 className="text-2xl font-bold text-red-600">Report not found</h2>
          <p className="text-muted text-sm">Redirecting to dashboard...</p>
        </>
      ) : (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      )}
    </div>
  );
}
