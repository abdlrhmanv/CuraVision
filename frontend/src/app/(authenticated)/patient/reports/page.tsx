'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, Report, reportsApi } from '@/lib/apiClient'

export default function PatientReportsPage() {
  const { user, loading } = useRequireAuth('PATIENT')
  const [reports, setReports] = useState<Report[]>([])
  const [allReports, setAllReports] = useState<Report[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorFilter, setDoctorFilter] = useState('')

  const doctors = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of allReports) {
      if (r.doctor_id && r.doctor_name) map.set(r.doctor_id, r.doctor_name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allReports])

  useEffect(() => {
    if (loading || !user) return
    reportsApi.listForPatient().then((res) => setAllReports(res.reports)).catch(() => {})
  }, [loading, user])

  useEffect(() => {
    if (loading || !user) return
    const fetchReports = async () => {
      setFetching(true)
      try {
        const res = await reportsApi.listForPatient(
          doctorFilter ? { doctor_id: doctorFilter } : undefined
        )
        setReports(res.reports)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load')
      } finally {
        setFetching(false)
      }
    }
    fetchReports()
  }, [loading, user, doctorFilter])

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Loading...</div>
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">My Reports</h1>
          <p className="text-sm text-muted">Doctor-approved reports from your scans</p>
        </div>
        {doctors.length > 0 && (
          <div>
            <label htmlFor="doctor-filter" className="block text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
              Filter by doctor
            </label>
            <select
              id="doctor-filter"
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:border-accent"
            >
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}

      {fetching ? (
        <div className="text-sm text-muted">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted" />
          <div className="text-sm font-semibold">No reports available yet</div>
          <div className="text-xs text-muted mt-1">
            Once your doctor reviews and approves a scan, the report will appear here.
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Doctor</th>
                <th className="px-4 py-3 text-left">Scan</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/patient/reports/${r.id}`}
                      className="text-accent hover:underline font-semibold"
                    >
                      {new Date(r.updated_at).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.doctor_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {r.scan_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green/15 text-green">
                      {r.status}
                    </span>
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
