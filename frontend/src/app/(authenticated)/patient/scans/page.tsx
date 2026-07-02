'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Upload, X, Loader2, FileWarning, CheckCircle2 } from 'lucide-react'
import { patientApi, reservationsApi, type Scan } from '@/lib/apiClient'

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
    case 'ANALYSIS_PENDING':
      return { label: 'Analyzing', color: 'blue' }
    case 'UPLOADED':
      return { label: 'Uploaded', color: 'warn' }
    case 'FAILED':
      return { label: 'Failed', color: 'red' }
    default:
      return { label: status, color: 'blue' }
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface Doctor {
  id: string
  full_name: string
  email: string
}

export default function PatientScans() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload modal state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadScans = useCallback(() => {
    setLoading(true)
    patientApi
      .getScans()
      .then((res) => { setScans(res.scans); setError(null) })
      .catch((err) => setError(err.message || 'Failed to load scans'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadScans() }, [loadScans])

  // Fetch doctors when modal opens
  useEffect(() => {
    if (!showUploadModal) return
    setDoctorsLoading(true)
    reservationsApi
      .listDoctors()
      .then((res) => {
        setDoctors(res.doctors)
        if (res.doctors.length > 0) setSelectedDoctorId(res.doctors[0].id)
      })
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false))
  }, [showUploadModal])

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds 50MB limit.')
      setSelectedFile(null)
      return
    }
    setUploadError(null)
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const resetUploadModal = useCallback(() => {
    setShowUploadModal(false)
    setSelectedFile(null)
    setUploadError(null)
    setIsDragging(false)
    setUploading(false)
    setSelectedDoctorId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !selectedDoctorId) return
    setUploading(true)
    setUploadError(null)
    try {
      await patientApi.uploadScan(selectedFile, selectedDoctorId)
      resetUploadModal()
      loadScans()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }, [selectedFile, selectedDoctorId, resetUploadModal, loadScans])

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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

  const canUpload = selectedFile && selectedDoctorId && !uploading

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
              <p className="text-xs">Upload a scan to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={resetUploadModal}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Upload Scan</h3>
              <button onClick={resetUploadModal} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".dcm,.dicom,.jpg,.jpeg,.png,application/dicom,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-accent bg-accent/10'
                    : selectedFile
                      ? 'border-green/50 bg-green/5'
                      : 'border-border hover:border-accent'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 size={32} className="mx-auto mb-2 text-green" />
                    <div className="text-sm font-semibold text-green">{selectedFile.name}</div>
                    <div className="text-xs text-muted mt-1">{formatFileSize(selectedFile.size)}</div>
                    <div className="text-xs text-accent mt-2 hover:underline">Click to change file</div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className={`mx-auto mb-2 ${isDragging ? 'text-accent' : 'text-muted'}`} />
                    <div className="text-sm font-semibold">{isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}</div>
                    <div className="text-xs text-muted mt-1">DICOM, JPG, PNG (max 50MB)</div>
                  </>
                )}
              </div>

              {/* Doctor selection */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Assign Doctor</label>
                {doctorsLoading ? (
                  <div className="flex items-center gap-2 h-11 px-4 rounded-lg bg-surface border border-border text-sm text-muted">
                    <Loader2 size={14} className="animate-spin" /> Loading doctors...
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="h-11 px-4 rounded-lg bg-surface border border-border text-sm text-muted flex items-center">
                    No doctors available
                  </div>
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                  >
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {uploadError && (
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <FileWarning size={14} /> {uploadError}
                </div>
              )}

              <textarea rows={3} className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none" placeholder="Notes for doctor (optional)" />

              <div className="flex gap-3">
                <button onClick={resetUploadModal} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition">Cancel</button>
                <button
                  disabled={!canUpload}
                  onClick={handleUpload}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                    canUpload
                      ? 'bg-blue text-[#050B18] hover:bg-[#6fa0ff]'
                      : 'bg-blue/30 text-[#050B18]/50 cursor-not-allowed'
                  }`}
                >
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}