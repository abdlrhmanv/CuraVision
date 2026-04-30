'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, AuthUser, api, scansApi } from '@/lib/apiClient'

export default function DoctorUploadPage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const router = useRouter()
  const [patients, setPatients] = useState<AuthUser[]>([])
  const [patientId, setPatientId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    api
      .get<{ users: AuthUser[] }>('/api/admin/users?role=PATIENT')
      .then((res) => {
        setPatients(res.users)
        if (res.users.length > 0) setPatientId(res.users[0].id)
      })
      .catch(() => {
        // Fallback: admin endpoint is gated; leave the list empty so the doctor can
        // paste the patient ID manually.
      })
  }, [loading, user])

  const handleSubmit = async () => {
    if (!file || !patientId) {
      setError('Select a patient and a DICOM file.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await scansApi.upload(file, patientId)
      router.push(`/doctor/scans/${res.scan_id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
      setSubmitting(false)
    }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-1">Upload Scan</h1>
      <p className="text-sm text-muted mb-6">
        Upload a DICOM file and trigger the AI analysis pipeline.
      </p>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">
            Patient
          </label>
          {patients.length > 0 ? (
            <select
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
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="patient-001"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-blue"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">
            DICOM file
          </label>
          <label className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue transition cursor-pointer block">
            <Upload size={28} className="mx-auto mb-2 text-muted" />
            <div className="text-sm font-semibold">
              {file ? file.name : 'Click to choose a DICOM file'}
            </div>
            <div className="text-xs text-muted mt-1">
              .dcm, max 200 MB
            </div>
            <input
              type="file"
              accept=".dcm,application/dicom,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Upload & Analyse'}
          </button>
        </div>
      </div>
    </div>
  )
}
