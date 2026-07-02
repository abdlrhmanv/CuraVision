'use client'

import { useState, useEffect } from 'react'
import { Brain, Upload, X, Loader2, FileWarning } from 'lucide-react'
import { patientApi, type Scan } from '@/lib/apiClient'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusDisplay(status: string): { label: string; color: string } {
  switch (status) {
    case 'ANALYSIS_COMPLETE':
      return { label: 'Complete', color: 'green' }
    case 'ANALYSIS_RUNNING':
      return { label: 'Analyzing', color: 'blue' }
    case 'UPLOADED':
      return { label: 'Uploaded', color: 'warn' }
    case 'FAILED':
      return { label: 'Failed', color: 'red' }
    default:
      return { label: status, color: 'blue' }
  }
}

export default function PatientScans() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    patientApi
      .getScans()
      .then((res) => setScans(res.scans))
      .catch((err) => setError(err.message || 'Failed to load scans'))
      .finally(() => setLoading(false))
  }, [])

  const getStatusBadge = (status: string) => {
    const { label, color } = statusDisplay(status)
    const colors: Record<string, string> = {
      green: 'bg-green/15 text-green',
      blue: 'bg-blue/15 text-blue',
      warn: 'bg-warn/15 text-warn',
      red: 'bg-red-500/15 text-red-400',
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors[color] || colors.blue}`}>{label}</span>
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold mb-1">My Scans</h2>
          <p className="text-sm text-muted">All your uploaded MRI and CT scans</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition flex items-center gap-2">
          <Upload size={14} /> Upload New Scan
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
          <FileWarning size={40} className="text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scans.map((scan) => (
            <div key={scan.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition cursor-pointer group">
              <div className="h-32 bg-surface/50 flex items-center justify-center relative">
                <div className="w-16 h-16 rounded-full border border-accent/30 flex items-center justify-center group-hover:border-accent transition">
                  <Brain size={28} className="text-accent/50 group-hover:text-accent transition" />
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] text-muted font-mono">{scan.modality}</div>
              </div>
              <div className="p-4">
                <div className="font-semibold text-sm">{scan.modality} Scan</div>
                <div className="text-xs text-muted mt-1">{formatDate(scan.uploaded_at)}</div>
                <div className="mt-2">{getStatusBadge(scan.status)}</div>
              </div>
            </div>
          ))}

          {scans.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted gap-3">
              <Brain size={48} className="text-accent/30" />
              <p className="text-sm font-semibold">No scans yet</p>
              <p className="text-xs">Your doctor will upload scans for you.</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Scan</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition cursor-pointer">
                <Upload size={32} className="mx-auto mb-2 text-muted" />
                <div className="text-sm font-semibold">Click to upload or drag and drop</div>
                <div className="text-xs text-muted mt-1">DICOM, JPG, PNG (max 50MB)</div>
              </div>
              <select className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm">
                <option>Brain MRI</option><option>CT Scan</option><option>X-Ray</option>
              </select>
              <textarea rows={3} className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none" placeholder="Notes for doctor (optional)" />
              <div className="flex gap-3">
                <button onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition">Cancel</button>
                <button onClick={() => { setShowUploadModal(false); alert('Scan uploaded successfully!'); }} className="flex-1 px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition">Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}