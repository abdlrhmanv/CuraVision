'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, patientsApi, scansApi } from '@/lib/apiClient'

const MAX_BYTES = 100 * 1024 * 1024

export default function DoctorUploadPage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const router = useRouter()
  const [patients, setPatients] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [patientId, setPatientId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cancelUpload, setCancelUpload] = useState<null | (() => void)>(null)

  useEffect(() => {
    if (loading || !user) return
    patientsApi
      .list()
      .then((res) => {
        setPatients(res.patients)
        if (res.patients.length > 0) setPatientId(res.patients[0].id)
      })
      .catch(() => {
        // Leave empty so the doctor can paste a patient ID manually.
      })
  }, [loading, user])

  const handleSubmit = async () => {
    if (!file || !patientId) {
      setError('Select a patient and a DICOM file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File size exceeds maximum limit (100MB).')
      return
    }
    setSubmitting(true)
    setError(null)
    setProgress(0)
    try {
      const { promise, cancel } = await scansApi.uploadWithProgress(file, patientId, {
        onProgress: (pct) => setProgress(pct),
      })
      setCancelUpload(() => cancel)
      const res = await promise
      router.push(`/doctor/scans/${res.scan_id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
      setSubmitting(false)
      setCancelUpload(null)
    }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <main className="max-w-2xl focus:outline-none" tabIndex={-1}>
      <h1 className="text-2xl font-extrabold mb-1">Upload Scan</h1>
      <p className="text-sm text-muted mb-6">
        Upload a DICOM file and trigger the AI analysis pipeline.
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label htmlFor="patientSelect" className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">
            Patient
          </label>
          {patients.length > 0 ? (
            <select
              id="patientSelect"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-blue"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} — {p.email}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="patientSelect"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="patient-001"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-blue"
            />
          )}
        </div>

        <div>
          <label htmlFor="dicomUpload" className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">
            DICOM file
          </label>
          <label
            htmlFor="dicomUpload"
            className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer block ${
              dragActive ? 'border-blue bg-blue/5' : 'border-border hover:border-blue'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setDragActive(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              const dropped = e.dataTransfer.files?.[0] ?? null
              setFile(dropped)
            }}
          >
            <Upload size={28} className="mx-auto mb-2 text-muted" aria-hidden="true" />
            <div className="text-sm font-semibold">
              {file ? file.name : 'Click to choose a DICOM or JPEG file'}
            </div>
            <div className="text-xs text-muted mt-1">
              .dcm or .jpg, max 100 MB
            </div>
            <input
              id="dicomUpload"
              type="file"
              accept=".dcm,application/dicom,.jpg,.jpeg,image/jpeg"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 1) {
                  setError('Only one file can be uploaded at a time.')
                  setFile(files[0] ?? null)
                  return
                }
                setFile(files?.[0] ?? null)
              }}
              className="hidden"
              aria-label="Upload DICOM or JPEG file"
            />
          </label>
        </div>

        {submitting && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded bg-surface border border-border overflow-hidden">
              <div className="h-full bg-blue" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              cancelUpload?.()
              setSubmitting(false)
              setCancelUpload(null)
              router.back()
            }}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition"
          >
            Cancel
          </button>
          {submitting && cancelUpload && (
            <button
              onClick={() => {
                cancelUpload()
                setSubmitting(false)
                setCancelUpload(null)
                setError('Upload cancelled.')
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition"
            >
              Cancel Upload
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Upload Scan'}
          </button>
        </div>
      </div>
    </main>
  )
}
