'use client'

import { useState } from 'react'

export default function DoctorSettings() {
  const [preferences, setPreferences] = useState({
    email: true,
    appointmentReminders: true,
    reportAlerts: true,
    darkMode: false,
  })

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences({ ...preferences, [key]: !preferences[key] })
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-extrabold mb-1">Settings</h2>
      <p className="text-sm text-muted mb-4">Manage your account and notification preferences</p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Notifications</h3>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Email notifications</span>
            <button
              onClick={() => togglePreference('email')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${preferences.email ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}
            >
              {preferences.email ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Appointment reminders</span>
            <button
              onClick={() => togglePreference('appointmentReminders')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${preferences.appointmentReminders ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}
            >
              {preferences.appointmentReminders ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Report alerts</span>
            <button
              onClick={() => togglePreference('reportAlerts')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${preferences.reportAlerts ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}
            >
              {preferences.reportAlerts ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted">Compact layout</span>
            <button
              onClick={() => togglePreference('darkMode')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${preferences.darkMode ? 'bg-accent/15 text-accent' : 'bg-muted/15 text-muted'}`}
            >
              {preferences.darkMode ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-sm mb-3">Data & Privacy</h3>
          <button className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-warn hover:border-warn transition">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
