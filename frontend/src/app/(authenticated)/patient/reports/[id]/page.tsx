'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, Report, reportsApi } from '@/lib/apiClient'
import { ChatbotPanel } from '@/components/medical/ChatbotPanel'

export default function PatientReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useRequireAuth('PATIENT')
  const [report, setReport] = useState<Report | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(true)

  useEffect(() => {
    if (loading || !user || !id) return
    const load = async () => {
      setFetching(true)
      setError(null)
      try {
        const r = await reportsApi.getForPatient(id)
        setReport(r)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load report')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [loading, user, id])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  if (fetching) return <div className="p-6 text-sm text-muted">Loading report...</div>

  if (error || !report) {
    return (
      <div className="p-6">
        <Link href="/patient/reports" className="text-sm text-accent hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to reports
        </Link>
        <div className="text-sm text-warn">{error ?? 'Report not found.'}</div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/patient/reports" className="text-sm text-accent hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <FileText size={22} className="text-accent" /> Approved Report
          </h1>
          <p className="text-sm text-muted mt-1">
            Dr. {report.doctor_name ?? 'Unknown'} ·{' '}
            {new Date(report.updated_at).toLocaleDateString(undefined, {
              dateStyle: 'long',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition flex items-center gap-2"
        >
          <Download size={14} /> Download PDF
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-24 print:border-0 print:p-0">
        <div className="text-xs text-muted mb-4 print:hidden">
          Report ID: <span className="font-mono">{report.id}</span> · Scan{' '}
          {report.scan_id.slice(0, 8)}
        </div>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-text">
          {report.final_report ?? 'Report contents unavailable.'}
        </pre>
      </div>

      <div className="fixed bottom-5 right-5 z-40 w-full max-w-sm print:hidden">
        {chatOpen ? (
          <div className="shadow-2xl rounded-xl overflow-hidden border border-border">
            <div className="flex justify-end bg-card border-b border-border px-2 py-1">
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-xs text-muted hover:text-white px-2 py-1"
              >
                Minimize
              </button>
            </div>
            <ChatbotPanel reportId={report.id} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="ml-auto block px-4 py-3 rounded-full bg-accent text-[#050B18] text-sm font-bold shadow-lg hover:bg-[#00ddd4] transition"
          >
            Ask about this report
          </button>
        )}
      </div>
    </>
  )
}
