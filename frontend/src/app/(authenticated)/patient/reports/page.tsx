'use client'

import { useEffect, useState } from 'react'
import { FileText, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, Report, reportsApi } from '@/lib/apiClient'

export default function PatientReportsPage() {
  const { user, loading } = useRequireAuth('PATIENT')
  const [reports, setReports] = useState<Report[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Report | null>(null)

  useEffect(() => {
    if (loading || !user) return
    setFetching(true)
    reportsApi
      .listForPatient()
      .then((res) => {
        setReports(res.reports)
        if (res.reports.length > 0) setSelected(res.reports[0])
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setFetching(false))
  }, [loading, user])

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Loading...</div>
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">My Reports</h1>
        <p className="text-sm text-muted">Doctor-approved reports from your scans</p>
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
          <div className="text-sm font-semibold">No published reports yet</div>
          <div className="text-xs text-muted mt-1">
            Once your doctor reviews and approves a scan, the report will appear here.
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-2">
            {reports.map((r) => {
              const active = selected?.id === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left bg-card border rounded-xl p-4 hover:border-accent transition ${
                    active ? 'border-accent' : 'border-border'
                  }`}
                >
                  <div className="text-xs text-muted">Report · {r.id.slice(0, 8)}</div>
                  <div className="text-sm font-semibold mt-1">
                    {new Date(r.updated_at).toLocaleDateString()}
                  </div>
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-green/15 text-green">
                    {r.status}
                  </span>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted">Report ID</div>
                  <div className="text-sm font-mono">{selected.id}</div>
                </div>
                <Link
                  href="/patient/chatbot"
                  className="px-3 py-1.5 rounded-lg bg-accent text-[#050B18] text-xs font-bold hover:bg-[#00ddd4] transition flex items-center gap-2"
                >
                  <MessageSquare size={14} /> Ask AI about this
                </Link>
              </div>

              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-text">
                {selected.final_report ?? 'Report contents unavailable.'}
              </pre>
            </div>
          )}
        </div>
      )}
    </>
  )
}
