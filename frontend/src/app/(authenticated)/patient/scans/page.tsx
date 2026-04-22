'use client'

import { useState } from 'react'
import { Brain, Plus, Upload, X } from 'lucide-react'

export default function PatientScans() {
  const [showUploadModal, setShowUploadModal] = useState(false)

  const scans = [
    { id: 1, name: 'Brain MRI - Axial T1', date: 'Mar 10, 2026', status: 'Complete', statusColor: 'green' },
    { id: 2, name: 'CT Scan - Coronal', date: 'Feb 28, 2026', status: 'In Review', statusColor: 'blue' },
    { id: 3, name: 'Brain MRI - Sagittal T2', date: 'Jan 14, 2026', status: 'Complete', statusColor: 'green' },
  ]

  const getStatusBadge = (status: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green/15 text-green',
      blue: 'bg-blue/15 text-blue',
      warn: 'bg-warn/15 text-warn',
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors[color]}`}>{status}</span>
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scans.map((scan) => (
          <div key={scan.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition cursor-pointer group">
            <div className="h-32 bg-surface/50 flex items-center justify-center relative">
              <div className="w-16 h-16 rounded-full border border-accent/30 flex items-center justify-center group-hover:border-accent transition">
                <Brain size={28} className="text-accent/50 group-hover:text-accent transition" />
              </div>
              <div className="absolute bottom-2 right-2 text-[10px] text-muted font-mono">DICOM</div>
            </div>
            <div className="p-4">
              <div className="font-semibold text-sm">{scan.name}</div>
              <div className="text-xs text-muted mt-1">{scan.date}</div>
              <div className="mt-2">{getStatusBadge(scan.status, scan.statusColor)}</div>
            </div>
          </div>
        ))}

        <button onClick={() => setShowUploadModal(true)} className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-accent transition group min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition">
            <Plus size={24} className="text-accent" />
          </div>
          <div className="text-sm font-semibold text-muted group-hover:text-accent transition">Upload New Scan</div>
          <div className="text-xs text-muted">DICOM, JPG, PNG</div>
        </button>
      </div>

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