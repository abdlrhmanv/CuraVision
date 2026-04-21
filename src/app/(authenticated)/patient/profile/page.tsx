'use client'

import { useState } from 'react'

export default function PatientProfile() {
  const [formData, setFormData] = useState({
    firstName: 'Omar',
    lastName: 'Tarek',
    email: 'omar.tarek@email.com',
    phone: '+20 10 1234 5678',
    dob: '2000-05-14',
    country: 'Egypt',
    gender: 'Male',
    bloodType: 'O+',
    allergies: 'Penicillin',
    conditions: 'Migraine with aura',
    medications: 'Topiramate 25mg daily',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-1">My Profile</h2>
      <p className="text-sm text-muted mb-4">Personal and medical information</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <input name="firstName" value={formData.firstName} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent" placeholder="First name" />
              <input name="lastName" value={formData.lastName} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent" placeholder="Last name" />
              <input name="email" value={formData.email} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent md:col-span-2" placeholder="Email" />
              <input name="phone" value={formData.phone} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm" placeholder="Phone" />
              <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm" />
              <select name="country" value={formData.country} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm">
                <option>Egypt</option><option>USA</option><option>UK</option><option>Canada</option>
              </select>
              <select name="gender" value={formData.gender} onChange={handleChange} className="h-11 px-4 rounded-lg bg-surface border border-border text-sm">
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <button className="mt-4 px-4 py-2 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition">Save Changes</button>
          </div>

          {/* Medical Information */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Medical Information</h3>
            <div className="space-y-3">
              <select name="bloodType" value={formData.bloodType} onChange={handleChange} className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm">
                <option>O+</option><option>A+</option><option>B+</option><option>AB+</option><option>O-</option>
              </select>
              <input name="allergies" value={formData.allergies} onChange={handleChange} className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm" placeholder="Allergies" />
              <input name="conditions" value={formData.conditions} onChange={handleChange} className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm" placeholder="Chronic conditions" />
              <textarea name="medications" value={formData.medications} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none" placeholder="Current medications" />
            </div>
            <button className="mt-4 px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition">Save Medical Info</button>
          </div>
        </div>

        {/* Sidebar Card */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="w-20 h-20 rounded-full bg-accent/15 text-accent text-2xl font-bold flex items-center justify-center mx-auto mb-3">OT</div>
            <div className="font-bold">{formData.firstName} {formData.lastName}</div>
            <div className="text-xs text-muted mt-1">Patient since Jan 2026</div>
            <button className="mt-3 w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:border-accent hover:text-accent transition">Change Photo</button>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Account Security</h3>
            <button className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:border-blue hover:text-blue transition">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  )
}