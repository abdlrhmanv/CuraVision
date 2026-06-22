'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, History, RefreshCw, Save } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import {
  ApiError,
  Report,
  ReportCorrection,
  API_BASE_URL,
  reportsApi,
  scansApi,
} from '@/lib/apiClient'
import DicomViewer from '@/components/medical/DicomViewer'
import { useScanAnalysisStatus } from '@/hooks/useScanAnalysisStatus'
import { ReportEditor } from '@/components/medical/ReportEditor'

function storageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
}

export default function DoctorScanReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading } = useRequireAuth('DOCTOR')

  const [report, setReport] = useState<Report | null>(null)
  const [draftText, setDraftText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [corrections, setCorrections] = useState<ReportCorrection[]>([])
  const [correctionsOpen, setCorrectionsOpen] = useState(false)

  const loadCorrections = async (reportId: string) => {
    try {
      const res = await reportsApi.corrections(reportId)
      setCorrections(res.corrections)
    } catch {
      // HITL history is optional info; ignore errors silently.
    }
  }

  const { scan, analysis, loading: pollingLoading, error: pollingError } = useScanAnalysisStatus(id);

  const fetchReport = async () => {
    if (!id || !scan || scan.status !== 'ANALYSIS_COMPLETE') return;
    try {
      const r = await scansApi.reportForScan(id);
      setReport(r);
      if (r && !draftText) setDraftText(r.final_report ?? r.ai_draft ?? '');
      if (r) loadCorrections(r.id);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchReport();
  }, [scan?.status]);

  const handleSave = async (newText: string) => {
    if (!report) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await reportsApi.patch(report.id, { final_report: newText });
      setReport(updated);
      setDraftText(newText);
      setMessage('Draft saved.');
      loadCorrections(report.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!report) return;
    if (!draftText.trim()) {
      setError('Finalize the report text before approving.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (report.final_report !== draftText) {
        await reportsApi.patch(report.id, { final_report: draftText });
      }
      const approved = await reportsApi.approve(report.id);
      setReport(approved);
      setMessage('Report approved and published to the patient.');
      loadCorrections(report.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve');
    } finally {
      setBusy(false);
    }
  };

  if (loading || pollingLoading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>;
  if (!scan) {
    return (
      <div className="p-6 text-sm text-muted">
        {pollingError?.message ?? error ?? 'Loading scan...'}
        <button
          onClick={() => router.back()}
          className="ml-4 text-blue hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const dicomSrc = storageUrl(scan.dicom_path);
  const heatmapSrc = storageUrl(analysis?.gradcam_path);

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-1">
            Scan Review
          </div>
          <h1 className="text-2xl font-extrabold font-mono">{scan.id}</h1>
          <p className="text-xs text-muted mt-1">
            Patient {scan.patient_id} · {scan.modality} · Uploaded {new Date(scan.uploaded_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded bg-surface border border-border text-muted">
            {scan.status}
          </span>
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted hover:text-white hover:border-blue transition flex items-center gap-2"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-3 px-3 py-2 rounded-md bg-green/10 border border-green/30 text-sm text-green">
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <DicomViewer src={dicomSrc} caption="Source DICOM" />
        <DicomViewer src={heatmapSrc} caption="Grad-CAM heatmap" />
      </div>

      {analysis && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
              Tumor volume
            </div>
            <div className="text-xl font-mono font-bold">
              {analysis.tumor_volume_cc ?? '—'} <span className="text-xs text-muted">cc</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
              Location
            </div>
            <div>{analysis.tumor_location_description ?? '—'}</div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ReportEditor
          initialReport={draftText}
          onSave={handleSave}
          onApprove={handleApprove}
          isApproving={busy}
          status={report?.status ?? (scan.status === 'ANALYSIS_COMPLETE' ? 'LOADING' : 'PENDING')}
        />
      </div>

      {report && (
        <div className="bg-card border border-border rounded-xl p-5 mt-6">
          <button
            type="button"
            onClick={() => setCorrectionsOpen((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <History size={14} />
              HITL corrections history
              <span className="text-xs text-muted">({corrections.length})</span>
            </span>
            <span className="text-xs text-muted">
              {correctionsOpen ? 'Hide' : 'Show'}
            </span>
          </button>
          {correctionsOpen && (
            <div className="mt-4 space-y-3">
              {corrections.length === 0 && (
                <p className="text-xs text-muted">
                  No corrections recorded yet. Edits to the final report are
                  captured automatically and stored for model retraining.
                </p>
              )}
              {corrections.map((c) => (
                <div
                  key={c.id}
                  className="border border-border rounded-lg p-3 bg-surface/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted">
                      {c.field}
                    </span>
                    <span className="text-[10px] text-muted font-mono">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-muted mb-1">Before</div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted leading-relaxed max-h-40 overflow-auto">
                        {c.old_value ?? '—'}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted mb-1">After</div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-40 overflow-auto">
                        {c.new_value ?? '—'}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
