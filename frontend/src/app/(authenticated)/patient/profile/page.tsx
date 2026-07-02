'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, type PatientProfile, patientApi } from '@/lib/apiClient'
import { showError, showSuccess } from '@/lib/sweetAlert'

export default function PatientProfilePage() {
  const { user, loading } = useRequireAuth('PATIENT')
  const [formData, setFormData] = useState<PatientProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading || !user) return
    patientApi
      .getProfile()
      .then(setFormData)
      .catch(() => {
        setFormData({
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          date_of_birth: null,
          gender: null,
          phone: null,
          country: null,
          medical_history: null,
          allergies: null,
        })
      })
      .finally(() => setFetching(false))
  }, [loading, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!formData) return
    setSaving(true)
    try {
      const updated = await patientApi.updateProfile({
        phone: formData.phone ?? undefined,
        date_of_birth: formData.date_of_birth ?? undefined,
        gender: formData.gender ?? undefined,
        country: formData.country ?? undefined,
        medical_history: formData.medical_history ?? undefined,
        allergies: formData.allergies ?? undefined,
      })
      setFormData(updated)
      showSuccess('Profile updated', 'Your profile has been saved successfully.')
    } catch (err) {
      showError(
        'Save failed',
        err instanceof ApiError ? err.message : 'Could not update profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || fetching || !formData) {
    return <div className="p-6 text-sm text-muted">Loading...</div>
  }

  const initials = formData.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-1">My Profile</h2>
      <p className="text-sm text-muted mb-4">Personal and medical information</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase text-muted font-semibold">Full name</label>
                <input
                  value={formData.full_name}
                  disabled
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm text-muted"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] uppercase text-muted font-semibold">Email</label>
                <input
                  value={formData.email}
                  disabled
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm text-muted"
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-[10px] uppercase text-muted font-semibold">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={formData.phone ?? ''}
                  onChange={handleChange}
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label htmlFor="dob" className="text-[10px] uppercase text-muted font-semibold">
                  Date of birth
                </label>
                <input
                  id="dob"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth ?? ''}
                  onChange={handleChange}
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                />
              </div>
              <div>
                <label htmlFor="country" className="text-[10px] uppercase text-muted font-semibold">
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  value={formData.country ?? ''}
                  onChange={handleChange}
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                />
              </div>
              <div>
                <label htmlFor="gender" className="text-[10px] uppercase text-muted font-semibold">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender ?? ''}
                  onChange={handleChange}
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Medical History</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="allergies" className="text-[10px] uppercase text-muted font-semibold">
                  Allergies
                </label>
                <input
                  id="allergies"
                  name="allergies"
                  value={formData.allergies ?? ''}
                  onChange={handleChange}
                  className="mt-1 w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                  placeholder="Allergies"
                />
              </div>
              <div>
                <label
                  htmlFor="medical_history"
                  className="text-[10px] uppercase text-muted font-semibold"
                >
                  Medical history
                </label>
                <textarea
                  id="medical_history"
                  name="medical_history"
                  value={formData.medical_history ?? ''}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none"
                  placeholder="Conditions, medications, notes"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-4 px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/15 text-accent text-2xl font-bold flex items-center justify-center mx-auto mb-3">
              {initials}
            </div>
            <div className="font-bold">{formData.full_name}</div>
            <div className="text-xs text-muted mt-1">Patient</div>
          </div>
        </div>
      </div>
    </div>
  )
}
