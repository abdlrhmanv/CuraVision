'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, DoctorScan, scansApi } from '@/lib/apiClient'

function statusTone(status: string): string {
  if (status === 'ANALYSIS_COMPLETE') return 'bg-green/15 text-green'
  if (status === 'FAILED') return 'bg-warn/15 text-warn'
  if (status.startsWith('ANALYSIS')) return 'bg-blue/15 text-blue'
  return 'bg-surface text-muted border border-border'
}

export default function DoctorScansPage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [scans, setScans] = useState<DoctorScan[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    const fetchScans = async () => {
      setFetching(true)
      try {
        const res = await scansApi.listForDoctor()
        setScans(res.scans)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load')
      } finally {
        setFetching(false)
      }
    }
    fetchScans()
  }, [loading, user])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">All Scans</h1>
          <p className="text-sm text-muted">Every scan assigned to you</p>
        </div>
        <Link
          href="/doctor/upload"
          className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition"
        >
          Upload new
        </Link>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}

      {fetching ? (
        <div className="text-sm text-muted">Loading...</div>
      ) : scans.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Brain size={40} className="mx-auto mb-3 text-muted" />
          <div className="text-sm font-semibold">No scans yet</div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Scan ID</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Modality</th>
                <th className="px-4 py-3 text-left">Uploaded</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Report</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link href={`/doctor/scans/${s.id}`} className="font-mono text-xs text-blue hover:underline">
                      {s.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.patient_name ?? '—'}</td>
                  <td className="px-4 py-3">{s.modality}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(s.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded ${statusTone(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.report_status ? (
                      <span className="text-[10px] px-2 py-1 rounded bg-surface border border-border text-muted">
                        {s.report_status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
