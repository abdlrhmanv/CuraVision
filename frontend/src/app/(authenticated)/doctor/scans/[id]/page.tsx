'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { History, RefreshCw, Download, Trash2, ChevronRight, X, ShieldAlert, Activity } from 'lucide-react'
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
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
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
  const [isApproveModalOpen, setApproveModalOpen] = useState(false)

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

  const handleApproveClick = async () => {
    if (!report) return;
    if (!draftText.trim()) {
      setError('Finalize the report text before approving.');
      return;
    }
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    setApproveModalOpen(false);
    await handleApprove();
  };

  const handleToggleVisibility = async (visible: boolean) => {
    if (!report) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await reportsApi.toggleVisibility(report.id, visible);
      setReport(updated);
      setMessage(visible ? 'Report is now visible to the patient.' : 'Report is now hidden from the patient.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to toggle visibility');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteScan = async () => {
    if (!scan) return;
    if (!window.confirm('Are you sure you want to delete this scan? This action cannot be undone and will delete all associated files.')) return;
    setBusy(true);
    try {
      await scansApi.delete(scan.id);
      router.push('/doctor');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete scan');
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
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 bg-slate-900/10 py-1.5 px-3 rounded-lg border border-slate-800/30 w-fit">
        <span className="hover:text-sky-400 cursor-pointer">Breadcrumb</span>
        <ChevronRight size={12} className="text-slate-600" />
        <span className="hover:text-sky-400 cursor-pointer">Patients</span>
        <ChevronRight size={12} className="text-slate-600" />
        <span className="text-slate-300 font-medium">John Doe</span>
        <ChevronRight size={12} className="text-slate-600" />
        <span className="text-sky-400 font-semibold">MRI Review</span>
      </div>

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
          <button
            onClick={handleDeleteScan}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-warn/10 border border-warn/30 text-xs text-warn hover:bg-warn hover:text-white transition flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={12} /> Delete
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

      {/* Main Medical Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
        {/* Left Columns: MRI Viewer & Report Editor */}
        <div className="lg:col-span-2 space-y-6">
          <DicomViewer
            src={dicomSrc}
            maskSrc={isAnalysisComplete && analysis?.unet_mask_path ? storageUrl(analysis.unet_mask_path) : null}
            heatmapSrc={isAnalysisComplete && analysis?.gradcam_path ? storageUrl(analysis.gradcam_path) : null}
            caption={isAnalysisComplete ? "Source DICOM with AI Analysis Overlays" : "Source DICOM"}
            height={500}
          />

          {/* AI Metrics Correction UI */}
          {isAnalysisComplete && analysis && (
            <div className="bg-card border border-border rounded-xl p-5 text-sm">
              {editMetrics ? (
                <div className="space-y-4">
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
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-muted">Need to adjust calculated volume or location findings?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCorrectedVolume(String(analysis.tumor_volume_cc ?? ''));
                      setCorrectedLocation(analysis.tumor_location_description ?? '');
                      setEditMetrics(true);
                    }}
                    className="px-3 py-1.5 rounded bg-surface border border-border text-xs text-muted hover:text-white hover:border-blue transition"
                  >
                    Correct AI Metrics
                  </button>
                </div>
              )}
            </div>
          )}

          {!isAnalysisComplete && !isUploaded && !isFailed && isAnalyzing && (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center p-6 text-muted relative overflow-hidden h-32">
              <Skeleton className="absolute inset-0 bg-surface/10" />
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <p className="text-sm font-semibold">AI analysis in progress...</p>
                <p className="text-xs text-muted">Running segmentation and Grad-CAM overlays</p>
              </div>
            </div>
          )}

          {isUploaded && (
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <div className="bg-card border border-warn/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-warn">Analysis failed</p>
                <p className="text-xs text-muted mt-1">This scan could not be processed. Retry analysis or upload a different DICOM.</p>
              </div>
              <button
                type="button"
                onClick={handleTriggerAnalysis}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition disabled:opacity-50"
              >
                {busy ? 'Starting...' : 'Retry AI Analysis'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Status Badges, AI Insights & Workflow Timeline */}
        <div className="space-y-6">
          {/* Status & Insights Panel */}
          <div className="bg-[#0a0e1a] border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status</span>
              {/* Badge Rendering */}
              {isAnalysisComplete ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Analysis Complete
                </span>
              ) : isAnalyzing ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                  Reviewing
                </span>
              ) : isFailed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Ready
                </span>
              )}
            </div>

            {/* AI Confidence Visualizer */}
            {isAnalysisComplete && analysis?.confidence != null && (
              <div className="mb-5 bg-[#0f1526] p-3 rounded-lg border border-slate-800/80">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      analysis.confidence >= 90 ? 'bg-emerald-500' :
                      analysis.confidence >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    AI Confidence
                  </span>
                  <span className={`font-mono font-bold ${
                    analysis.confidence >= 90 ? 'text-emerald-400' :
                    analysis.confidence >= 70 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{analysis.confidence.toFixed(1)}%</span>
                </div>
                <div className={`${
                  analysis.confidence >= 90 ? 'text-emerald-400' :
                  analysis.confidence >= 70 ? 'text-amber-400' : 'text-rose-400'
                } font-mono text-xs tracking-tight break-all`}>
                  {'█'.repeat(Math.round(analysis.confidence / 6.6))}
                </div>
              </div>
            )}

            {/* AI Insights Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity size={13} className="text-sky-400" />
                AI Insights
              </h3>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs border-t border-slate-800/50 pt-3">
                <div className="text-slate-400">Confidence</div>
                <div className="text-right font-mono font-semibold text-slate-200">
                  {isAnalysisComplete && analysis?.confidence != null ? `${analysis.confidence.toFixed(1)}%` : '—'}
                </div>

                <div className="text-slate-400">Tumor Type</div>
                <div className="text-right font-semibold text-slate-200">
                  {isAnalysisComplete ? (analysis?.tumor_type ?? '—') : '—'}
                </div>

                <div className="text-slate-400">Risk Level</div>
                {isAnalysisComplete && analysis?.risk_level ? (
                  <div className={`text-right font-semibold flex items-center justify-end gap-1 ${
                    analysis.risk_level === 'High' ? 'text-rose-400' :
                    analysis.risk_level === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      analysis.risk_level === 'High' ? 'bg-rose-500' :
                      analysis.risk_level === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    {analysis.risk_level}
                  </div>
                ) : (
                  <div className="text-right font-semibold text-slate-200">—</div>
                )}

                <div className="text-slate-400">Tumor Volume</div>
                <div className="text-right font-mono font-semibold text-slate-200">
                  {isAnalysisComplete && analysis?.tumor_volume_cc != null ? `${analysis.tumor_volume_cc} cc` : '—'}
                </div>

                <div className="text-slate-400">Estimated Diameter</div>
                <div className="text-right font-mono font-semibold text-slate-200">
                  {isAnalysisComplete && analysis?.estimated_diameter != null ? `${analysis.estimated_diameter} cm` : '—'}
                </div>

                <div className="text-slate-400">Brain Hemisphere</div>
                <div className="text-right font-semibold text-slate-200">
                  {isAnalysisComplete ? (analysis?.brain_hemisphere ?? '—') : '—'}
                </div>

                <div className="text-slate-400">Lobe</div>
                <div className="text-right font-semibold text-slate-200">
                  {isAnalysisComplete ? (analysis?.lobe ?? '—') : '—'}
                </div>

                <div className="text-slate-400">Location</div>
                <div className="text-right text-slate-300 text-[11px] leading-tight">
                  {isAnalysisComplete ? (analysis?.tumor_location_description ?? '—') : '—'}
                </div>

                <div className="text-slate-400">Segmentation Quality</div>
                {isAnalysisComplete && analysis?.segmentation_quality ? (
                  <div className={`text-right font-medium ${
                    analysis.segmentation_quality === 'Excellent' ? 'text-emerald-400' :
                    analysis.segmentation_quality === 'Good' ? 'text-sky-400' : 'text-slate-400'
                  }`}>
                    {analysis.segmentation_quality}
                  </div>
                ) : (
                  <div className="text-right font-medium text-slate-200">—</div>
                )}

                <div className="text-slate-400">Growth vs. Prev Scan</div>
                {isAnalysisComplete ? (
                  analysis?.growth_pct != null ? (
                    <div className={`text-right font-semibold font-mono ${analysis.growth_pct > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {analysis.growth_pct > 0 ? `+${analysis.growth_pct}%` : `${analysis.growth_pct}%`}
                    </div>
                  ) : (
                    <div className="text-right text-slate-400 font-medium">N/A (Baseline Scan)</div>
                  )
                ) : (
                  <div className="text-right font-semibold text-slate-200">—</div>
                )}

                <div className="text-slate-400">Suggested Action</div>
                {isAnalysisComplete && analysis?.suggested_action ? (
                  <div className={`text-right text-[10px] leading-tight font-medium ${
                    analysis.risk_level === 'High' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {analysis.suggested_action}
                  </div>
                ) : (
                  <div className="text-right text-[10px] leading-tight font-medium text-slate-200">—</div>
                )}

                <div className="text-slate-400">Processing Time</div>
                <div className="text-right font-mono text-slate-400">
                  {isAnalysisComplete && analysis?.processing_time_sec != null ? `${analysis.processing_time_sec.toFixed(1)} sec` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Timeline Card */}
          <div className="bg-[#0a0e1a] border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-800 pb-2.5">
              Workflow Timeline
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {/* Step 1: Upload */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-[21px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border border-[#0a0e1a] flex items-center justify-center text-white text-[8px] font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Upload</h4>
                  <p className="text-[10px] text-slate-400">DICOM ingestion complete</p>
                </div>
              </div>

              {/* Step 2: AI Processing */}
              <div className="relative flex items-start gap-3">
                <span className={`absolute -left-[21px] top-0.5 w-4 h-4 rounded-full border border-[#0a0e1a] flex items-center justify-center text-white text-[8px] font-bold ${
                  isAnalysisComplete ? 'bg-emerald-500' : 'bg-slate-700'
                }`}>
                  {isAnalysisComplete ? '✓' : '○'}
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">AI Processing</h4>
                  <p className="text-[10px] text-slate-400">Segmentation mapping</p>
                </div>
              </div>

              {/* Step 3: Doctor Draft */}
              <div className="relative flex items-start gap-3">
                <span className={`absolute -left-[21px] top-0.5 w-4 h-4 rounded-full border border-[#0a0e1a] flex items-center justify-center text-white text-[8px] font-bold ${
                  report ? 'bg-emerald-500' : 'bg-slate-700'
                }`}>
                  {report ? '✓' : '○'}
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Doctor Draft</h4>
                  <p className="text-[10px] text-slate-400">Clinical notes editing</p>
                </div>
              </div>

              {/* Step 4: Published */}
              <div className="relative flex items-start gap-3">
                <span className={`absolute -left-[21px] top-0.5 w-4 h-4 rounded-full border border-[#0a0e1a] flex items-center justify-center text-white text-[8px] font-bold ${
                  report?.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-slate-700'
                }`}>
                  {report?.status === 'PUBLISHED' ? '✓' : '○'}
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Published</h4>
                  <p className="text-[10px] text-slate-400">Final report released to patient</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor & History Section */}
      {isAnalysisComplete && (
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
              onApprove={handleApproveClick}
              isApproving={busy}
              status={report?.status ?? 'LOADING'}
              patientVisible={report?.patient_visible}
              onToggleVisibility={handleToggleVisibility}
            />
          )}
        </div>
      )}

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

      {/* Confirmation Modal */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0d1322] border border-slate-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0a0e1a]/80">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-amber-500" />
                Approve Report
              </h3>
              <button 
                onClick={() => setApproveModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs border border-slate-800/80 bg-[#0f1526]/50 p-4 rounded-lg">
                <div className="text-slate-400 font-medium">Patient</div>
                <div className="text-right font-semibold text-slate-200">{scan.patient_name ?? scan.patient_id}</div>

                <div className="text-slate-400 font-medium">Tumor Volume</div>
                <div className="text-right font-mono font-semibold text-slate-200">
                  {isAnalysisComplete && analysis?.tumor_volume_cc != null ? `${analysis.tumor_volume_cc} cc` : '—'}
                </div>

                <div className="text-slate-400 font-medium">AI Confidence</div>
                <div className="text-right font-mono font-semibold text-slate-200">
                  {isAnalysisComplete && analysis?.confidence != null ? `${analysis.confidence.toFixed(1)}%` : '—'}
                </div>
              </div>

              <div className="text-center py-2">
                <p className="text-sm font-medium text-slate-300">Are you sure?</p>
                <p className="text-xs text-slate-400 mt-1">This report will be locked and published to the patient portal.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0a0e1a]/80 flex justify-end gap-2.5">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/20"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
