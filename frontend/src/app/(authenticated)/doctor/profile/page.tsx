'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/lib/authContext'

export default function DoctorProfile() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [formData, setFormData] = useState({
    firstName: 'Dr. Omar',
    lastName: 'Tarek',
    email: 'omar.tarek@curavision.com',
    phone: '+20 10 1234 5678',
    specialty: 'Neurology',
    hospital: 'CuraVision Medical Center',
    yearsExperience: '12',
    bio: 'Specializes in neuroimaging review and patient care coordination.',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-1">My Profile</h2>
      <p className="text-sm text-muted mb-4">Manage your professional profile and contact details</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
                placeholder="First name"
              />
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
                placeholder="Last name"
              />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent md:col-span-2"
                placeholder="Email"
              />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                placeholder="Phone"
              />
              <input
                name="yearsExperience"
                value={formData.yearsExperience}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                placeholder="Years of experience"
              />
            </div>
            <button className="mt-4 px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition">
              Save Changes
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Professional Information</h3>
            <div className="space-y-3">
              <input
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                placeholder="Specialty"
              />
              <input
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm"
                placeholder="Hospital or clinic"
              />
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none"
                placeholder="Short biography"
              />
            </div>
            <button className="mt-4 px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition">
              Save Professional Info
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="w-20 h-20 rounded-full bg-blue/15 text-blue text-2xl font-bold flex items-center justify-center mx-auto mb-3">
              {formData.firstName[0]}
              {formData.lastName[0]}
            </div>
            <div className="font-bold">{formData.firstName} {formData.lastName}</div>
            <div className="text-xs text-muted mt-1">{formData.specialty}</div>
            <button className="mt-3 w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:border-accent hover:text-accent transition">
              Change Photo
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Account Security</h3>
            <button className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:border-blue hover:text-blue transition">
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
