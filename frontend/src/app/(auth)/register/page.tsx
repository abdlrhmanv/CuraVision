'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-bg relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[420px] bg-[radial-gradient(ellipse,rgba(0,198,184,0.08),transparent_65%)] pointer-events-none" />
      
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 w-full max-w-[650px] relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-7">
          <Link href="/" className="text-xl font-extrabold tracking-tight inline-block">
            Cura<span className="text-accent">Vision</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-3">Create your account</h1>
          <p className="text-sm text-muted mt-1">Join CuraVision as a patient or doctor</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-surface border border-border rounded-lg p-1 mb-6">
          <button
            onClick={() => setRole('patient')}
            className={`py-2.5 text-center text-sm font-semibold rounded-md transition ${
              role === 'patient' ? 'bg-accent text-[#050B18]' : 'text-muted hover:text-white'
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => setRole('doctor')}
            className={`py-2.5 text-center text-sm font-semibold rounded-md transition ${
              role === 'doctor' ? 'bg-blue text-[#050B18]' : 'text-muted hover:text-white'
            }`}
          >
            Doctor
          </button>
        </div>

        {/* PATIENT FORM */}
        {role === 'patient' ? (
          <>
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">First name</label>
                <input className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Last name</label>
                <input className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Email */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Email address</label>
              <input type="email" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* Password */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Password</label>
              <input type="password" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* DOB & Phone */}
            <div className="grid grid-cols-2 gap-3.5 mt-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Date of birth</label>
                <input type="date" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Phone number</label>
                <input className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Country & Gender */}
            <div className="grid grid-cols-2 gap-3.5 mt-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Country</label>
                <select className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  <option>Egypt</option>
                  <option>USA</option>
                  <option>UK</option>
                  <option>Canada</option>
                  <option>Germany</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Gender</label>
                <select className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            <div className="h-px bg-border my-5" />

            {/* Medical History Section */}
            <div className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-semibold mb-3">🩺 MEDICAL HISTORY</div>

            {/* Previous Conditions */}
            <div className="mb-4">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Previous brain tumors / neurological conditions</label>
              <textarea rows={3} placeholder="e.g., Diagnosed with meningioma in 2020, family history of Alzheimer's, previous stroke in 2018..." className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm resize-vertical focus:outline-none focus:border-accent" />
            </div>

            {/* Current Symptoms */}
            <div className="mb-4">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Current symptoms (describe in detail)</label>
              <textarea rows={3} placeholder="e.g., Persistent headaches on left side for 2 months, occasional blurred vision, memory lapses..." className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm resize-vertical focus:outline-none focus:border-accent" />
            </div>

            {/* Symptoms Checklist */}
            <div className="mb-4">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-2">Common symptoms (check all that apply)</label>
              <div className="grid grid-cols-2 gap-2">
                {['Headaches / Migraines', 'Vision changes', 'Memory issues', 'Numbness / Tingling', 'Seizures', 'Dizziness / Balance problems'].map(symptom => (
                  <label key={symptom} className="flex items-center gap-2 p-2 bg-surface rounded-lg border border-border cursor-pointer hover:border-accent transition">
                    <input type="checkbox" className="w-4 h-4 accent-accent" />
                    <span className="text-xs text-muted">{symptom}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-warn/10 border border-warn/20 rounded-xl p-4 my-4">
              <div className="text-[11px] tracking-wide uppercase text-warn font-semibold mb-3">🚨 Emergency Contact</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] tracking-wide uppercase text-muted font-semibold block mb-1">Full name</label>
                  <input className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-[10px] tracking-wide uppercase text-muted font-semibold block mb-1">Phone number</label>
                  <input className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] tracking-wide uppercase text-muted font-semibold block mb-1">Relationship</label>
                <input placeholder="e.g., spouse, parent, sibling" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Allergies & Medications */}
            <div>
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Allergies & current medications</label>
              <textarea rows={2} placeholder="e.g., Allergic to penicillin, currently taking Metformin 500mg daily" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm resize-vertical focus:outline-none focus:border-accent" />
            </div>
          </>
        ) : (
          /* DOCTOR FORM */
          <>
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">First name</label>
                <input placeholder="John" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Last name</label>
                <input placeholder="Doe" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Email */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Email address</label>
              <input type="email" placeholder="john.doe@hospital.com" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* Password */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            <div className="h-px bg-border my-5" />

            {/* Professional Details */}
            <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-3">Professional details</div>

            {/* License Number */}
            <div className="mb-3">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Medical license number</label>
              <input placeholder="EGY-2012-12345" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* Specialty & Experience */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Specialty</label>
                <select className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm text-white focus:outline-none focus:border-accent">
                  <option>Neurologist</option>
                  <option>Radiologist</option>
                  <option>Cardiologist</option>
                  <option>Psychiatrist</option>
                  <option>Neurosurgeon</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Years of experience</label>
                <input type="number" placeholder="5" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Country & City */}
            <div className="grid grid-cols-2 gap-3.5 mt-3.5">
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Country</label>
                <input placeholder="Egypt" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">City</label>
                <input placeholder="Cairo" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
              </div>
            </div>

            {/* Hospital */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Hospital or clinic affiliation</label>
              <input placeholder="Cairo University Hospital" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* Education */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Medical school / Education</label>
              <input placeholder="e.g., Cairo University, Johns Hopkins University" className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
            </div>

            {/* Certifications */}
            <div className="mt-3.5">
              <label className="text-[11px] tracking-wide uppercase text-muted font-semibold block mb-1.5">Sub-specialties / Certifications</label>
              <textarea rows={2} className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm resize-vertical focus:outline-none focus:border-accent" />
            </div>
          </>
        )}

        {/* Submit Button */}
        <button className={`w-full py-3.5 rounded-lg text-sm font-bold transition mt-6 ${
          role === 'patient' ? 'bg-accent text-[#050B18] hover:bg-[#00ddd4]' : 'bg-blue text-[#050B18] hover:bg-[#6fa0ff]'
        }`}>
          Create {role === 'patient' ? 'Patient' : 'Doctor'} Account
        </button>

        {/* Login Link */}
        <div className="text-center text-xs text-muted mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}