'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Brain, Search } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, DoctorScan, scansApi } from '@/lib/apiClient'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'UPLOADED', label: 'UPLOADED' },
  { value: 'ANALYSIS_PENDING', label: 'ANALYSIS_PENDING' },
  { value: 'ANALYSIS_RUNNING', label: 'ANALYSIS_RUNNING' },
  { value: 'ANALYSIS_COMPLETE', label: 'ANALYSIS_COMPLETE' },
  { value: 'FAILED', label: 'FAILED' },
]

const MODALITY_OPTIONS = [
  { value: '', label: 'All modalities' },
  { value: 'MRI', label: 'MRI' },
  { value: 'CT', label: 'CT' },
]

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
  const [statusFilter, setStatusFilter] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchScans = useCallback(async () => {
    if (!user) return
    setFetching(true)
    setError(null)
    try {
      const res = await scansApi.listForDoctor({
        status: statusFilter || undefined,
        modality: modalityFilter || undefined,
        search: searchQuery.trim() || undefined,
      })
      setScans(res.scans)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load')
    } finally {
      setFetching(false)
    }
  }, [user, statusFilter, modalityFilter, searchQuery])

  useEffect(() => {
    if (loading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchScans()
  }, [loading, user, fetchScans])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
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

      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="status-filter" className="block text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
            Status
          </label>
          <select
            id="status-filter"
            data-testid="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:border-blue"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="modality-filter" className="block text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
            Modality
          </label>
          <select
            id="modality-filter"
            data-testid="modality-filter"
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:border-blue"
          >
            {MODALITY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="patient-search" className="block text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
            Patient name
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="patient-search"
              type="search"
              placeholder="Search by patient name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-border rounded-md pl-9 pr-3 py-2 text-sm bg-surface focus:outline-none focus:border-blue"
            />
          </div>
        </div>
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
          <div className="text-sm font-semibold">No scans found</div>
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
