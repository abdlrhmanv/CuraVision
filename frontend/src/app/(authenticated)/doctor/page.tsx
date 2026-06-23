'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Brain, FileText, Upload, Users } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, DoctorScan, scansApi } from '@/lib/apiClient'

function statusTone(status: string): string {
  if (status === 'ANALYSIS_COMPLETE') return 'bg-green/15 text-green'
  if (status === 'FAILED') return 'bg-warn/15 text-warn'
  if (status.startsWith('ANALYSIS')) return 'bg-blue/15 text-blue'
  return 'bg-surface text-muted border border-border'
}

export default function DoctorDashboard() {
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
        setError(err instanceof ApiError ? err.message : 'Failed to load scans')
      } finally {
        setFetching(false)
      }
    }
    fetchScans()
  }, [loading, user])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  const pending = scans.filter((s) => s.status !== 'ANALYSIS_COMPLETE').length
  const drafts = scans.filter((s) => s.report_status === 'DRAFT').length
  const published = scans.filter((s) => s.report_status === 'PUBLISHED').length

  return (
    <>
      <div className="bg-gradient-to-r from-blue/10 via-accent/5 to-purple/5 border border-border rounded-2xl p-5 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-blue font-semibold mb-2">
            Doctor Dashboard
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome, {user.full_name}
          </h1>
          <p className="text-xs text-muted mt-1.5">
            Review AI-generated drafts, approve reports, and manage scans.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/doctor/upload"
            className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-xs font-bold hover:bg-[#6fa0ff] transition flex items-center gap-2"
          >
            <Upload size={14} /> Upload Scan
          </Link>
          <Link
            href="/doctor/scans"
            className="px-4 py-2 rounded-lg bg-accent text-[#050B18] text-xs font-bold hover:bg-[#00ddd4] transition flex items-center gap-2"
          >
            <Brain size={14} /> All Scans
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total scans', value: scans.length, icon: Brain },
          { label: 'Analysis pending', value: pending, icon: Brain },
          { label: 'Drafts to review', value: drafts, icon: FileText },
          { label: 'Published reports', value: published, icon: Users },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <Icon size={20} className="text-blue mb-2" />
              <div className="text-2xl font-mono font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted mt-1">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-3">
          Recent scans
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : scans.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">
            No scans yet. Use <span className="text-blue">Upload Scan</span> to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {scans.slice(0, 8).map((s) => (
              <Link
                key={s.id}
                href={`/doctor/scans/${s.id}`}
                className="bg-surface border border-border rounded-lg p-3.5 flex items-center justify-between gap-3 flex-wrap hover:border-blue transition"
              >
                <div>
                  <div className="text-sm font-semibold">
                    {s.patient_name ?? 'Unknown patient'} · {s.modality}
                  </div>
                  <div className="text-xs text-muted mt-1 font-mono">
                    {s.id.slice(0, 8)} · {new Date(s.uploaded_at).toLocaleString()}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded ${statusTone(s.status)}`}>
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
