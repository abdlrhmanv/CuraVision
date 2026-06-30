'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Brain,
  FileText,
  Newspaper,
  User,
  Upload,
  Calendar,
  Settings,
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { ApiError, patientApi, PatientStats, Report } from '@/lib/apiClient'

function statusTone(status: string): string {
  if (status === 'PUBLISHED') return 'bg-green/15 text-green'
  if (status === 'REVIEWED') return 'bg-blue/15 text-blue'
  if (status === 'DRAFT') return 'bg-warn/15 text-warn'
  return 'bg-surface text-muted border border-border'
}

export default function PatientDashboard() {
  const { user, loading } = useRequireAuth('PATIENT')
  const router = useRouter()

  const [stats, setStats] = useState<PatientStats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    const fetchData = async () => {
      setFetching(true)
      try {
        const [statsRes, reportsRes] = await Promise.all([
          patientApi.getStats(),
          patientApi.getReports(),
        ])
        setStats(statsRes)
        setReports(reportsRes.reports)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data')
      } finally {
        setFetching(false)
      }
    }
    fetchData()
  }, [loading, user])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  const quickSections = [
    { id: 'chatbot', label: 'AI Chatbot', icon: MessageSquare, color: 'accent', href: '/patient/chatbot' },
    { id: 'scans', label: 'My Scans', icon: Brain, color: 'blue', href: '/patient/scans' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'purple', href: '/patient/reports' },
    { id: 'appointments', label: 'Appointments', icon: Calendar, color: 'green', href: '/patient/appointments' },
    { id: 'articles', label: 'Articles', icon: Newspaper, color: 'green', href: '/patient/articles' },
    { id: 'profile', label: 'Profile', icon: User, color: 'warn', href: '/patient/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'muted', href: '/patient/settings' },
  ]

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const statCards = [
    { value: stats?.total_scans ?? '—', label: 'Scans', icon: Brain },
    { value: stats?.total_reports ?? '—', label: 'Reports', icon: FileText },
    { value: stats?.total_appointments ?? '—', label: 'Appointments', icon: Calendar },
  ]

  return (
    <>
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-accent/10 via-blue/5 to-purple/5 border border-border rounded-2xl p-5 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-accent font-semibold mb-2">Patient Dashboard</div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{greeting}, {user.full_name} 👋</h1>
          <p className="text-xs text-muted mt-1.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — Your health journey with CuraVision
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/patient/chatbot')} className="px-4 py-2 rounded-lg bg-accent text-[#050B18] text-xs font-bold hover:bg-[#00ddd4] transition flex items-center gap-2">
            <MessageSquare size={14} /> Chatbot
          </button>
          <button onClick={() => router.push('/patient/scans')} className="px-4 py-2 rounded-lg bg-blue text-[#050B18] text-xs font-bold hover:bg-[#6fa0ff] transition flex items-center gap-2">
            <Upload size={14} /> My Scans
          </button>
        </div>
      </div>

      {/* Quick Menu */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {quickSections.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-accent hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <Icon size={24} className={`mx-auto mb-2 text-muted group-hover:text-${item.color} transition`} />
              <div className="text-xs text-muted font-medium">{item.label}</div>
            </button>
          )
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <Icon size={20} className="text-accent mb-2" />
              <div className="text-2xl font-mono font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted mt-1">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Recent Reports */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-3 flex items-center gap-2">
          <FileText size={12} /> Recent Reports
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
            {error}
          </div>
        )}

        {fetching ? (
          <div className="text-sm text-muted">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">
            No published reports yet. Your doctor will share them here once ready.
          </div>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 5).map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(`/patient/reports/${report.id}`)}
                className="w-full bg-surface border border-border rounded-lg p-3.5 flex items-center justify-between gap-3 flex-wrap hover:border-accent transition text-left"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    Report for scan {report.scan_id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {report.final_report
                      ? report.final_report.substring(0, 80) + '...'
                      : 'Report available — click to view.'}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded ${statusTone(report.status)}`}>
                  {report.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}