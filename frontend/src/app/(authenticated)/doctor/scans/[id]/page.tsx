'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { History, RefreshCw, Download } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/Skeleton'

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

  // HITL Corrections state
  const [editMetrics, setEditMetrics] = useState(false)
  const [correctedVolume, setCorrectedVolume] = useState('')
  const [correctedLocation, setCorrectedLocation] = useState('')
  const [savingMetrics, setSavingMetrics] = useState(false)

  const loadCorrections = useCallback(async (reportId: string) => {
    try {
      const res = await reportsApi.corrections(reportId)
      setCorrections(res.corrections)
    } catch {
      // HITL history is optional info; ignore errors silently.
    }
  }, [])

  const { scan, analysis, loading: pollingLoading, error: pollingError, refetch } = useScanAnalysisStatus(id);

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await scansApi.triggerAnalysis(id);
      setMessage('AI analysis started.');
      refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to start analysis');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateReport = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const r = await scansApi.createReport(id);
      setReport(r);
      setDraftText(r.final_report ?? r.ai_draft ?? '');
      loadCorrections(r.id);
      setMessage('Draft report created.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create report');
    } finally {
      setBusy(false);
    }
  };

  const fetchReport = useCallback(async () => {
    if (!id || !scan || scan.status !== 'ANALYSIS_COMPLETE') return;
    try {
      const r = await scansApi.reportForScan(id);
      setReport(r);
      if (r && !draftText) setDraftText(r.final_report ?? r.ai_draft ?? '');
      if (r) loadCorrections(r.id);
    } catch {
      // ignore
    }
  }, [id, scan, draftText, loadCorrections]);

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      fetchReport();
    };
    init();
  }, [fetchReport]);

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

  const handleSaveMetrics = async () => {
    if (!report || !analysis) return;
    const correctionsList: Array<{ field: string; old_value: string; new_value: string }> = [];
    if (correctedVolume !== String(analysis.tumor_volume_cc ?? '')) {
      correctionsList.push({
        field: 'tumor_volume_cc',
        old_value: String(analysis.tumor_volume_cc ?? ''),
        new_value: correctedVolume,
      });
    }
    if (correctedLocation !== (analysis.tumor_location_description ?? '')) {
      correctionsList.push({
        field: 'tumor_location_description',
        old_value: analysis.tumor_location_description ?? '',
        new_value: correctedLocation,
      });
    }

    if (correctionsList.length === 0) {
      setEditMetrics(false);
      return;
    }

    setSavingMetrics(true);
    setError(null);
    try {
      await reportsApi.patch(report.id, { corrections: correctionsList });
      setMessage('AI metrics corrected and saved.');
      // Re-fetch report and corrections history
      const r = await scansApi.reportForScan(id);
      setReport(r);
      loadCorrections(r.id);

      setEditMetrics(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save corrections');
    } finally {
      setSavingMetrics(false);
    }
  };

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>;

  if (!scan) {
    return (
      <div className="p-6 text-sm text-muted">
        {pollingLoading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-6 w-1/3 bg-surface/40 rounded" />
            <div className="h-10 w-full bg-surface/40 rounded" />
            <div className="h-64 w-full bg-surface/40 rounded" />
          </div>
        ) : (
          <>
            {pollingError?.message ?? error ?? 'Scan not found.'}
            <button
              onClick={() => router.back()}
              className="ml-4 text-blue hover:underline"
            >
              Go back
            </button>
          </>
        )}
      </div>
    );
  }

  const isAnalysisComplete = scan.status === 'ANALYSIS_COMPLETE';
  const isUploaded = scan.status === 'UPLOADED';
  const isFailed = scan.status === 'FAILED';
  const isAnalyzing = scan.status === 'ANALYSIS_PENDING' || scan.status === 'ANALYSIS_RUNNING';
  const dicomSrc = storageUrl(scan.dicom_path);
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
          {report?.status === 'PUBLISHED' && (
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs hover:text-white transition flex items-center gap-2"
            >
              <Download size={12} /> Export PDF
            </button>
          )}
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

      <div className="mb-6">
        <DicomViewer
          src={dicomSrc}
          maskSrc={isAnalysisComplete && analysis?.unet_mask_path ? storageUrl(analysis.unet_mask_path) : null}
          heatmapSrc={isAnalysisComplete && analysis?.gradcam_path ? storageUrl(analysis.gradcam_path) : null}
          caption={isAnalysisComplete ? "Source DICOM with AI Analysis Overlays" : "Source DICOM"}
          height={500}
        />
      </div>

      {!isAnalysisComplete && !isUploaded && !isFailed && isAnalyzing && (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center p-6 text-muted relative overflow-hidden mb-6 h-32">
          <Skeleton className="absolute inset-0 bg-surface/10" />
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <p className="text-sm font-semibold">AI analysis in progress...</p>
            <p className="text-xs text-muted">Running segmentation and Grad-CAM overlays</p>
          </div>
        </div>
      )}

      {isUploaded && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Scan uploaded — ready for AI analysis</p>
            <p className="text-xs text-muted mt-1">Run analysis to generate segmentation masks and a draft report.</p>
          </div>
          <button
            type="button"
            onClick={handleTriggerAnalysis}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition disabled:opacity-50"
          >
            {busy ? 'Starting...' : 'Run AI Analysis'}
          </button>
        </div>
      )}

      {isFailed && (
        <div className="bg-card border border-warn/30 rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warn">Analysis failed</p>
            <p className="text-xs text-muted mt-1">This scan could not be processed. Create Report is unavailable.</p>
          </div>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg bg-surface border border-border text-sm font-bold text-muted cursor-not-allowed opacity-60"
          >
            Create Report
          </button>
        </div>
      )}

      {isAnalysisComplete && analysis ? (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 grid sm:grid-cols-3 gap-4 text-sm relative">
          {editMetrics ? (
            <div className="sm:col-span-3 space-y-4">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-muted">Correct AI Metrics</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Tumor Volume (cc)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue"
                    value={correctedVolume}
                    onChange={(e) => setCorrectedVolume(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-muted mb-1">Location Description</label>
                  <input
                    type="text"
                    className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue"
                    value={correctedLocation}
                    onChange={(e) => setCorrectedLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditMetrics(false)}
                  className="px-3 py-1.5 rounded bg-surface border border-border text-xs hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingMetrics}
                  onClick={handleSaveMetrics}
                  className="px-3 py-1.5 rounded bg-blue text-xs hover:bg-blue-600 text-white font-semibold transition"
                >
                  {savingMetrics ? 'Saving...' : 'Save Metrics'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
                  Tumor volume
                </div>
                <div className="text-xl font-mono font-bold">
                  {analysis.tumor_volume_cc ?? '—'} <span className="text-xs text-muted">cc</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
                  Location
                </div>
                <div>{analysis.tumor_location_description ?? '—'}</div>
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCorrectedVolume(String(analysis.tumor_volume_cc ?? ''));
                    setCorrectedLocation(analysis.tumor_location_description ?? '');
                    setEditMetrics(true);
                  }}
                  className="px-3 py-1.5 rounded bg-surface border border-border text-xs text-muted hover:text-white hover:border-blue transition"
                >
                  Correct Metrics
                </button>
              </div>
            </>
          )}
        </div>
      ) : !isAnalysisComplete && isAnalyzing ? (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 grid sm:grid-cols-3 gap-4 text-sm relative overflow-hidden">
          <Skeleton className="absolute inset-0 bg-surface/10" />
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
              Tumor volume
            </div>
            <div className="h-6 w-16 bg-surface/50 rounded animate-pulse" />
          </div>
          <div className="relative z-10 sm:col-span-2">
            <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
              Location
            </div>
            <div className="h-6 w-48 bg-surface/50 rounded animate-pulse" />
          </div>
        </div>
      ) : null}

      {isAnalysisComplete ? (
        <div className="mt-6">
          {!report ? (
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Analysis complete</p>
                <p className="text-xs text-muted mt-1">Create a draft report from AI findings.</p>
              </div>
              <button
                type="button"
                onClick={handleCreateReport}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition disabled:opacity-50"
              >
                {busy ? 'Creating...' : 'Create Report'}
              </button>
            </div>
          ) : (
            <ReportEditor
              reportId={report?.id}
              initialReport={draftText}
              onSave={handleSave}
              onApprove={handleApprove}
              isApproving={busy}
              status={report?.status ?? 'LOADING'}
            />
          )}
        </div>
      ) : !isAnalyzing && !isUploaded && !isFailed ? (
        <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden mt-6">
          <Skeleton className="absolute inset-0 bg-surface/10" />
          <div className="relative z-10 space-y-4">
            <div className="h-5 w-1/4 bg-surface/50 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-surface/40 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-surface/40 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-surface/40 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ) : null}

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
