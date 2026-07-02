'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, type PatientProfile, type PatientStats, patientApi } from '@/lib/apiClient'
import { showError, showSuccess } from '@/lib/sweetAlert'
import { User, Shield, Activity, Settings, X, Edit2, Check } from 'lucide-react'

// Helper for tags input
function TagsInput({ tags, onChange, disabled }: { tags: string[], onChange: (t: string[]) => void, disabled: boolean }) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = input.trim()
      if (val && !tags.includes(val)) {
        onChange([...tags, val])
      }
      setInput('')
    }
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-medium border border-accent/20">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(i)} className="text-accent/70 hover:text-accent">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type and press enter or comma..."
          className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
        />
      )}
    </div>
  )
}

export default function PatientProfilePage() {
  const { user, loading } = useRequireAuth('PATIENT')
  const [formData, setFormData] = useState<PatientProfile | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'preferences' | 'security'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  
  const [now] = useState(() => Date.now())

  useEffect(() => {
    if (loading || !user) return
    Promise.all([patientApi.getProfile(), patientApi.getStats()])
      .then(([profileRes, statsRes]) => {
        setFormData(profileRes)
        setStats(statsRes)
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => setFetching(false))
  }, [loading, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return
    setFormData({ ...formData, [e.target.name]: e.target.checked })
  }

  const handleTagsChange = (field: keyof PatientProfile, newTags: string[]) => {
    if (!formData) return
    setFormData({ ...formData, [field]: newTags })
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
        city: formData.city ?? undefined,
        address: formData.address ?? undefined,
        blood_type: formData.blood_type ?? undefined,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        medical_history: formData.medical_history ?? undefined,
        allergies: formData.allergies ?? undefined,
        chronic_diseases: formData.chronic_diseases ?? undefined,
        current_medications: formData.current_medications ?? undefined,
        previous_surgeries: formData.previous_surgeries ?? undefined,
        family_medical_history: formData.family_medical_history ?? undefined,
        smoking_status: formData.smoking_status ?? undefined,
        alcohol_status: formData.alcohol_status ?? undefined,
        preferred_language: formData.preferred_language ?? undefined,
        notification_email: formData.notification_email ?? undefined,
        notification_sms: formData.notification_sms ?? undefined,
        notification_push: formData.notification_push ?? undefined,
        share_anonymized_scans: formData.share_anonymized_scans ?? undefined,
      })
      setFormData(updated)
      setIsEditing(false)
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
    return <div className="p-6 text-sm text-muted animate-pulse">Loading profile...</div>
  }

  const initials = formData.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Calculations
  let age = '—'
  if (formData.date_of_birth) {
    const dob = new Date(formData.date_of_birth)
    const diff = now - dob.getTime()
    const ageDt = new Date(diff)
    age = Math.abs(ageDt.getUTCFullYear() - 1970).toString()
  }

  let bmi = '—'
  if (formData.height_cm && formData.weight_kg) {
    const hM = formData.height_cm / 100
    const calc = formData.weight_kg / (hM * hM)
    bmi = calc.toFixed(1)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-blue/20 text-accent text-3xl font-extrabold flex items-center justify-center flex-shrink-0 border-2 border-accent/30 shadow-[0_0_20px_rgba(0,221,212,0.1)]">
          {initials}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-text mb-1">{formData.full_name}</h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><User size={14} /> ID: {user.id.slice(0, 8)}</span>
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6 mt-4 md:mt-0 w-full md:w-auto justify-center md:justify-end">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{stats?.total_scans ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue">{stats?.total_reports ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Reports</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple">{stats?.total_appointments ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Appts</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => { setActiveTab('profile'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'profile' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <User size={18} /> Personal Info
          </button>
          <button
            onClick={() => { setActiveTab('medical'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'medical' ? 'bg-blue/10 text-blue border border-blue/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Activity size={18} /> Medical Info
          </button>
          <button
            onClick={() => { setActiveTab('preferences'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'preferences' ? 'bg-purple/10 text-purple border border-purple/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Settings size={18} /> AI Preferences
          </button>
          <button
            onClick={() => { setActiveTab('security'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'security' ? 'bg-warn/10 text-warn border border-warn/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Shield size={18} /> Security
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl">
            {/* Header / Actions */}
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg capitalize">{activeTab}</h3>
              {activeTab !== 'security' && (
                <div>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm hover:border-accent transition">
                      <Edit2 size={14} /> Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-surface text-sm hover:bg-surface/80 transition">
                        Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition">
                        <Check size={14} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Email</label>
                    <input value={formData.email} disabled className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Phone Number</label>
                    <input name="phone" value={formData.phone ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="+1 234 567 8900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Date of Birth</label>
                    <input type="date" name="date_of_birth" value={formData.date_of_birth ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Age</label>
                    <div className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted flex items-center">{age}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Gender</label>
                    <select name="gender" value={formData.gender ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">Country</label>
                    <input name="country" value={formData.country ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="E.g., Egypt" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted font-semibold">City</label>
                    <input name="city" value={formData.city ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="E.g., Cairo" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] uppercase text-muted font-semibold">Address (Optional)</label>
                    <input name="address" value={formData.address ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Full street address" />
                  </div>
                </div>
              )}

              {/* MEDICAL TAB */}
              {activeTab === 'medical' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-5 border-b border-border pb-6">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Blood Type</label>
                      <select name="blood_type" value={formData.blood_type ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                        <option value="">Unknown</option>
                        <option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option>
                        <option value="O+">O+</option><option value="O-">O-</option>
                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-muted font-semibold">Height (cm)</label>
                        <input type="number" name="height_cm" value={formData.height_cm ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="175" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-muted font-semibold">Weight (kg)</label>
                        <input type="number" name="weight_kg" value={formData.weight_kg ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="80" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">BMI</label>
                      <div className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted flex items-center font-mono">{bmi}</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Allergies</label>
                      <TagsInput tags={formData.allergies ?? []} onChange={(tags) => handleTagsChange('allergies', tags)} disabled={!isEditing} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Chronic Diseases</label>
                      <TagsInput tags={formData.chronic_diseases ?? []} onChange={(tags) => handleTagsChange('chronic_diseases', tags)} disabled={!isEditing} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Current Medications</label>
                      <TagsInput tags={formData.current_medications ?? []} onChange={(tags) => handleTagsChange('current_medications', tags)} disabled={!isEditing} />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Smoking Status</label>
                      <select name="smoking_status" value={formData.smoking_status ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                        <option value="">Unknown</option>
                        <option value="Never">Never</option>
                        <option value="Former">Former</option>
                        <option value="Current">Current</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Alcohol Status</label>
                      <select name="alcohol_status" value={formData.alcohol_status ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                        <option value="">Unknown</option>
                        <option value="Never">Never</option>
                        <option value="Occasionally">Occasionally</option>
                        <option value="Frequently">Frequently</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Previous Surgeries</label>
                      <textarea name="previous_surgeries" value={formData.previous_surgeries ?? ''} onChange={handleChange} disabled={!isEditing} rows={2} className={`w-full px-4 py-3 rounded-lg text-sm resize-none transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Appendicitis (2018), etc..." />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Family Medical History</label>
                      <textarea name="family_medical_history" value={formData.family_medical_history ?? ''} onChange={handleChange} disabled={!isEditing} rows={2} className={`w-full px-4 py-3 rounded-lg text-sm resize-none transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Mother: Diabetes..." />
                    </div>
                  </div>
                </div>
              )}

              {/* PREFERENCES TAB */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div className="space-y-3 border-b border-border pb-6">
                    <h4 className="text-sm font-semibold">General Preferences</h4>
                    <div className="max-w-xs space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Preferred Language</label>
                      <select name="preferred_language" value={formData.preferred_language ?? 'English'} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                        <option value="English">English</option>
                        <option value="Arabic">Arabic</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 border-b border-border pb-6">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="notifEmail" name="notification_email" checked={formData.notification_email} onChange={handleCheckboxChange} disabled={!isEditing} className="w-4 h-4 rounded border-border text-accent focus:ring-accent accent-accent" />
                      <label htmlFor="notifEmail" className="text-sm">Email Alerts</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="notifSms" name="notification_sms" checked={formData.notification_sms} onChange={handleCheckboxChange} disabled={!isEditing} className="w-4 h-4 rounded border-border text-accent focus:ring-accent accent-accent" />
                      <label htmlFor="notifSms" className="text-sm">SMS Alerts</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="notifPush" name="notification_push" checked={formData.notification_push} onChange={handleCheckboxChange} disabled={!isEditing} className="w-4 h-4 rounded border-border text-accent focus:ring-accent accent-accent" />
                      <label htmlFor="notifPush" className="text-sm">Push Notifications</label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">AI Medical Research</h4>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="shareAnonymized" name="share_anonymized_scans" checked={formData.share_anonymized_scans} onChange={handleCheckboxChange} disabled={!isEditing} className="w-4 h-4 rounded border-border text-accent focus:ring-accent accent-accent" />
                      <div>
                        <label htmlFor="shareAnonymized" className="text-sm font-medium">Share anonymized scans for AI improvement</label>
                        <p className="text-xs text-muted mt-1">Help us improve diagnostic accuracy worldwide by contributing de-identified medical data.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-warn/10 border border-warn/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <Shield className="text-warn shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-warn">Account Security</h4>
                        <p className="text-xs text-muted mt-1">Manage your passwords and active sessions. For major security changes, you will be required to re-authenticate.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-b border-border pb-6">
                    <h4 className="text-sm font-semibold">Change Password</h4>
                    <div className="max-w-md space-y-3">
                      <input type="password" placeholder="Current Password" disabled className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted cursor-not-allowed" />
                      <input type="password" placeholder="New Password" disabled className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted cursor-not-allowed" />
                      <button disabled className="px-4 py-2 rounded-lg bg-surface border border-border text-sm text-muted cursor-not-allowed">Update Password</button>
                    </div>
                  </div>

                  <div className="space-y-3 border-b border-border pb-6">
                    <h4 className="text-sm font-semibold">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted">Two-factor authentication is currently disabled.</p>
                    <button disabled className="px-4 py-2 rounded-lg bg-surface border border-border text-sm text-muted cursor-not-allowed">Enable 2FA</button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-red-400">Danger Zone</h4>
                    <p className="text-xs text-muted">Once you delete your account, there is no going back. Please be certain.</p>
                    <button className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition">Delete Account</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
