'use client'

import { useState } from 'react'

export default function PatientSettings() {
  const [notifications, setNotifications] = useState({
    email: true,
    appointments: true,
    reports: true,
    promotions: false,
  })

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({ ...notifications, [key]: !notifications[key] })
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-extrabold mb-1">Settings</h2>
      <p className="text-sm text-muted mb-4">Manage your account preferences</p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Email notifications</span>
            <button onClick={() => toggleNotification('email')} className={`px-3 py-1 rounded text-xs font-semibold transition ${notifications.email ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}>
              {notifications.email ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Appointment reminders</span>
            <button onClick={() => toggleNotification('appointments')} className={`px-3 py-1 rounded text-xs font-semibold transition ${notifications.appointments ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}>
              {notifications.appointments ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted">Report updates</span>
            <button onClick={() => toggleNotification('reports')} className={`px-3 py-1 rounded text-xs font-semibold transition ${notifications.reports ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}>
              {notifications.reports ? 'On' : 'Off'}
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted">Promotions & news</span>
            <button onClick={() => toggleNotification('promotions')} className={`px-3 py-1 rounded text-xs font-semibold transition ${notifications.promotions ? 'bg-green/15 text-green' : 'bg-muted/15 text-muted'}`}>
              {notifications.promotions ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-semibold text-sm mb-3">Data & Privacy</h3>
          <button className="w-full px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-warn hover:border-warn transition">Delete Account</button>
        </div>
      </div>
    </div>
  )
}