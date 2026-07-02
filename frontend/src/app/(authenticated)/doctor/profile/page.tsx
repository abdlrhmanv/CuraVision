'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, type DoctorProfileData, type DoctorStats, doctorsApi } from '@/lib/apiClient'
import { showError, showSuccess } from '@/lib/sweetAlert'
import { User, Shield, Activity, Settings, X, Edit2, Check, Clock, Stethoscope, Briefcase, Award } from 'lucide-react'

// Helper for tags input
function TagsInput({ tags, onChange, disabled, placeholder = "Type and press enter or comma..." }: { tags: string[], onChange: (t: string[]) => void, disabled: boolean, placeholder?: string }) {
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
          placeholder={placeholder}
          className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
        />
      )}
    </div>
  )
}

export default function DoctorProfilePage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [formData, setFormData] = useState<DoctorProfileData | null>(null)
  const [stats, setStats] = useState<DoctorStats | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'professional' | 'availability' | 'security' | 'settings'>('overview')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    Promise.all([
      doctorsApi.getProfile(user.id),
      doctorsApi.getStats(user.id)
    ])
      .then(([profileRes, statsRes]) => {
        setFormData(profileRes.doctor)
        setStats(statsRes)
      })
      .catch((err) => {
        console.error(err)
        showError('Error', 'Failed to load doctor profile')
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

  const handleTagsChange = (field: keyof DoctorProfileData, newTags: string[]) => {
    if (!formData) return
    setFormData({ ...formData, [field]: newTags })
  }

  const handleSave = async () => {
    if (!formData || !user) return
    setSaving(true)
    try {
      await doctorsApi.updateProfile(user.id, {
        full_name: formData.full_name,
        specialty: formData.specialty,
        subspecialties: formData.subspecialties,
        hospital: formData.hospital,
        years_experience: formData.years_experience ? Number(formData.years_experience) : null,
        phone: formData.phone,
        bio: formData.bio,
        education: formData.education,
        qualifications: formData.qualifications,
        board_certifications: formData.board_certifications,
        country: formData.country,
        city: formData.city,
        languages_spoken: formData.languages_spoken,
        consultation_fee: formData.consultation_fee ? Number(formData.consultation_fee) : null,
        date_of_birth: formData.date_of_birth,
        
        preferred_ai_model: formData.preferred_ai_model,
        enable_ai_suggestions: formData.enable_ai_suggestions,
        default_report_template: formData.default_report_template,
        notification_email: formData.notification_email,
        notification_sms: formData.notification_sms,
        notification_push: formData.notification_push,
        notification_critical: formData.notification_critical,
      })
      
      const refreshed = await doctorsApi.getProfile(user.id)
      setFormData(refreshed.doctor)
      
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
    .replace('Dr. ', '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Card */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-accent/20 to-blue/20 text-accent text-4xl font-extrabold flex items-center justify-center flex-shrink-0 border-[3px] border-accent/40 shadow-[0_0_30px_rgba(0,221,212,0.15)] relative">
          {initials}
          <div className="absolute bottom-0 right-0 bg-[#050B18] rounded-full p-1 border border-border">
            <Check size={14} className="text-accent" />
          </div>
        </div>
        
        <div className="flex-1 text-center lg:text-left space-y-3 z-10">
          <div>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <h2 className="text-3xl font-bold text-text mb-1">{formData.full_name}</h2>
              <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider border border-accent/20">
                Verified
              </span>
            </div>
            <p className="text-accent font-medium text-sm flex items-center justify-center lg:justify-start gap-2">
              <Stethoscope size={16} />
              {formData.specialty || 'General Practitioner'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Shield size={14} /> License: {formData.license_number}</span>
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> {formData.hospital || 'Private Clinic'}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mt-4 lg:mt-0 w-full lg:w-auto shrink-0 z-10">
          <div className="text-center bg-surface/50 p-3 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-text">{stats?.total_patients ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-1">Patients</div>
          </div>
          <div className="text-center bg-surface/50 p-3 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-accent">{stats?.total_reports_reviewed ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-1">Reports Reviewed</div>
          </div>
          <div className="text-center bg-surface/50 p-3 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-purple">{stats?.total_ai_analyses ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-1">AI Analyses</div>
          </div>
          <div className="text-center bg-surface/50 p-3 rounded-lg border border-border/50">
            <div className="text-2xl font-bold text-blue">{formData.years_experience || 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mt-1">Years Exp.</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => { setActiveTab('overview'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <User size={18} /> Overview
          </button>
          <button
            onClick={() => { setActiveTab('professional'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'professional' ? 'bg-blue/10 text-blue border border-blue/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Award size={18} /> Professional
          </button>
          <button
            onClick={() => { setActiveTab('availability'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'availability' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Clock size={18} /> Availability
          </button>
          <button
            onClick={() => { setActiveTab('security'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'security' ? 'bg-warn/10 text-warn border border-warn/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Shield size={18} /> Security
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setIsEditing(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings' ? 'bg-purple/10 text-purple border border-purple/20' : 'bg-transparent text-muted hover:bg-surface border border-transparent'
            }`}
          >
            <Settings size={18} /> Settings & AI
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl min-h-[500px]">
            {/* Header / Actions */}
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg capitalize flex items-center gap-2">
                {activeTab === 'overview' && <User size={20} className="text-accent" />}
                {activeTab === 'professional' && <Award size={20} className="text-blue" />}
                {activeTab === 'availability' && <Clock size={20} className="text-green-400" />}
                {activeTab === 'security' && <Shield size={20} className="text-warn" />}
                {activeTab === 'settings' && <Settings size={20} className="text-purple" />}
                {activeTab}
              </h3>
              
              {activeTab !== 'security' && activeTab !== 'availability' && (
                <div>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm hover:border-accent transition">
                      <Edit2 size={14} /> Edit Profile
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
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] uppercase text-muted font-semibold">Full Name</label>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} />
                  </div>
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
                    <input type="date" name="date_of_birth" value={formData.date_of_birth ? formData.date_of_birth.split('T')[0] : ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} />
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
                    <label className="text-[10px] uppercase text-muted font-semibold">Languages Spoken</label>
                    <TagsInput tags={formData.languages_spoken ?? []} onChange={(tags) => handleTagsChange('languages_spoken', tags)} disabled={!isEditing} placeholder="Arabic, English, French..." />
                  </div>
                </div>
              )}

              {/* PROFESSIONAL TAB */}
              {activeTab === 'professional' && (
                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Specialty</label>
                      <input name="specialty" value={formData.specialty ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Neurology" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Years of Experience</label>
                      <input type="number" name="years_experience" value={formData.years_experience ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="e.g. 10" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Subspecialties</label>
                      <TagsInput tags={formData.subspecialties ?? []} onChange={(tags) => handleTagsChange('subspecialties', tags)} disabled={!isEditing} placeholder="Brain Tumors, Stroke, MRI..." />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Primary Hospital / Clinic</label>
                      <input name="hospital" value={formData.hospital ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Ain Shams University Hospital" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-muted font-semibold">Consultation Fee ($)</label>
                      <input type="number" step="0.01" name="consultation_fee" value={formData.consultation_fee ?? ''} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="e.g. 150.00" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Qualifications</label>
                      <TagsInput tags={formData.qualifications ?? []} onChange={(tags) => handleTagsChange('qualifications', tags)} disabled={!isEditing} placeholder="MBBS, MD Neurology, PhD..." />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Board Certifications</label>
                      <TagsInput tags={formData.board_certifications ?? []} onChange={(tags) => handleTagsChange('board_certifications', tags)} disabled={!isEditing} placeholder="American Board of Psychiatry and Neurology..." />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] uppercase text-muted font-semibold">Biography</label>
                      <textarea name="bio" value={formData.bio ?? ''} onChange={handleChange} disabled={!isEditing} rows={4} className={`w-full px-4 py-3 rounded-lg text-sm resize-none transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`} placeholder="Write a professional biography..." />
                    </div>
                  </div>
                </div>
              )}

              {/* AVAILABILITY TAB */}
              {activeTab === 'availability' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center text-center py-10 bg-surface/30 rounded-xl border border-dashed border-border">
                    <Clock size={48} className="text-muted mb-4 opacity-50" />
                    <h4 className="text-lg font-bold mb-2">Manage Availability</h4>
                    <p className="text-sm text-muted max-w-sm mb-6">Set your weekly schedule and working hours for patient consultations and tele-medicine.</p>
                    <a href="/doctor/availability" className="px-6 py-2.5 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition shadow-[0_0_15px_rgba(0,221,212,0.3)]">
                      Go to Availability Page
                    </a>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="bg-warn/10 border border-warn/20 rounded-xl p-5">
                    <div className="flex gap-4">
                      <Shield className="text-warn shrink-0" size={24} />
                      <div>
                        <h4 className="font-bold text-warn mb-1">Account Security</h4>
                        <p className="text-sm text-muted">Manage your passwords, two-factor authentication, and active sessions. For major security changes, you will be required to re-authenticate.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-border pb-8">
                    <h4 className="text-sm font-semibold">Change Password</h4>
                    <div className="max-w-md space-y-4">
                      <input type="password" placeholder="Current Password" disabled className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted cursor-not-allowed" />
                      <input type="password" placeholder="New Password" disabled className="w-full h-11 px-4 rounded-lg bg-surface/50 border border-transparent text-sm text-muted cursor-not-allowed" />
                      <button disabled className="px-6 py-2.5 rounded-lg bg-surface border border-border text-sm text-muted cursor-not-allowed">Update Password</button>
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-border pb-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted">Two-factor authentication is currently disabled.</p>
                      </div>
                      <button disabled className="px-4 py-2 rounded-lg bg-surface border border-border text-sm text-muted cursor-not-allowed">Enable 2FA</button>
                    </div>
                  </div>

                  <div className="space-y-4 border-b border-border pb-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Active Sessions</h4>
                        <p className="text-sm text-muted">You have 1 active session on this device.</p>
                      </div>
                      <button disabled className="px-4 py-2 rounded-lg bg-surface border border-border text-sm text-muted cursor-not-allowed">Log out all devices</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-red-400">Danger Zone</h4>
                    <p className="text-sm text-muted max-w-lg">Once you delete your account, there is no going back. All patient reports will be reassigned or anonymized based on hospital policy.</p>
                    <button className="px-6 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition font-medium">Delete Account</button>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="space-y-8">
                  {/* AI Preferences */}
                  <div className="space-y-5 border-b border-border pb-8">
                    <h4 className="font-semibold text-lg flex items-center gap-2"><Activity size={18} className="text-accent" /> AI Platform Preferences</h4>
                    
                    <div className="max-w-md space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase text-muted font-semibold">Preferred AI Model</label>
                        <select name="preferred_ai_model" value={formData.preferred_ai_model} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                          <option value="GPT-5">GPT-5 (High Accuracy)</option>
                          <option value="Claude">Claude 3.5 (Detailed Reasoning)</option>
                          <option value="Groq">Groq (Ultra Fast)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase text-muted font-semibold">Default Report Template</label>
                        <select name="default_report_template" value={formData.default_report_template} onChange={handleChange} disabled={!isEditing} className={`w-full h-11 px-4 rounded-lg text-sm transition ${isEditing ? 'bg-surface border border-border focus:border-accent focus:outline-none' : 'bg-surface/50 border border-transparent text-muted cursor-not-allowed'}`}>
                          <option value="Brain MRI">Brain MRI Standard</option>
                          <option value="CT">CT Scan Standard</option>
                          <option value="Custom">Custom Template</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <input type="checkbox" id="aiSuggs" name="enable_ai_suggestions" checked={formData.enable_ai_suggestions} onChange={handleCheckboxChange} disabled={!isEditing} className="w-5 h-5 rounded border-border text-accent focus:ring-accent accent-accent" />
                        <div>
                          <label htmlFor="aiSuggs" className="text-sm font-medium">Enable AI Suggestions</label>
                          <p className="text-xs text-muted mt-0.5">Receive inline diagnostic suggestions during report editing.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="space-y-5 border-b border-border pb-8">
                    <h4 className="font-semibold text-lg">Notification Settings</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="notifEmail" name="notification_email" checked={formData.notification_email} onChange={handleCheckboxChange} disabled={!isEditing} className="w-5 h-5 rounded border-border text-accent focus:ring-accent accent-accent" />
                        <label htmlFor="notifEmail" className="text-sm">Email Alerts (Scans ready, appointments)</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="notifSms" name="notification_sms" checked={formData.notification_sms} onChange={handleCheckboxChange} disabled={!isEditing} className="w-5 h-5 rounded border-border text-accent focus:ring-accent accent-accent" />
                        <label htmlFor="notifSms" className="text-sm">SMS Alerts (Urgent updates)</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="notifPush" name="notification_push" checked={formData.notification_push} onChange={handleCheckboxChange} disabled={!isEditing} className="w-5 h-5 rounded border-border text-accent focus:ring-accent accent-accent" />
                        <label htmlFor="notifPush" className="text-sm">Push Notifications (Browser/App)</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="notifCrit" name="notification_critical" checked={formData.notification_critical} onChange={handleCheckboxChange} disabled={!isEditing} className="w-5 h-5 rounded border-border text-red-500 focus:ring-red-500 accent-red-500" />
                        <div>
                          <label htmlFor="notifCrit" className="text-sm font-medium text-red-400">Critical Findings Alerts</label>
                          <p className="text-xs text-muted mt-0.5">Immediate notifications when AI detects potentially life-threatening anomalies.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Certificates (Mocked) */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Verification Certificates</h4>
                    <p className="text-sm text-muted">Upload your medical license and board certificates for platform verification.</p>
                    
                    <div className="grid sm:grid-cols-3 gap-4 mt-4">
                      <div className="p-4 rounded-xl border border-dashed border-border bg-surface/30 text-center hover:bg-surface/50 transition cursor-pointer">
                        <Briefcase className="mx-auto mb-2 text-muted" size={24} />
                        <div className="text-sm font-medium">Medical License</div>
                        <div className="text-[10px] text-muted mt-1">Upload PDF/JPG</div>
                      </div>
                      <div className="p-4 rounded-xl border border-dashed border-border bg-surface/30 text-center hover:bg-surface/50 transition cursor-pointer">
                        <Award className="mx-auto mb-2 text-muted" size={24} />
                        <div className="text-sm font-medium">Board Certificate</div>
                        <div className="text-[10px] text-muted mt-1">Upload PDF/JPG</div>
                      </div>
                      <div className="p-4 rounded-xl border border-dashed border-border bg-surface/30 text-center hover:bg-surface/50 transition cursor-pointer">
                        <User className="mx-auto mb-2 text-muted" size={24} />
                        <div className="text-sm font-medium">Curriculum Vitae</div>
                        <div className="text-[10px] text-muted mt-1">Upload PDF</div>
                      </div>
                    </div>
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
