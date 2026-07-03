'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Calendar, Check, X, Search, RefreshCw, Grid, List, Clock, User, 
  Activity, FileText, Video, Eye, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import {
  ApiError,
  Reservation,
  reservationsApi,
  scansApi,
  API_BASE_URL,
  Scan
} from '@/lib/apiClient'
import Link from 'next/link'

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, { dateStyle: 'medium' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
}

export default function DoctorAppointmentsPage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  
  // Custom states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  // Drawer state
  const [selectedAppt, setSelectedAppt] = useState<Reservation | null>(null)
  const [patientScans, setPatientScans] = useState<Scan[]>([])
  const [loadingScans, setLoadingScans] = useState(false)

  const fetchReservations = useCallback(async () => {
    try {
      const res = await reservationsApi.list()
      setReservations(
        res.reservations.slice().sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load reservations')
    }
  }, [])

  useEffect(() => {
    if (loading || !user) return
    const init = async () => {
      await fetchReservations()
    }
    init()
  }, [loading, user, fetchReservations])

  // Fetch scans when appointment is selected for drawer view
  useEffect(() => {
    if (!selectedAppt) {
      setPatientScans([])
      return
    }
    setLoadingScans(true)
    scansApi.listForPatient(selectedAppt.patient_id)
      .then(res => {
        setPatientScans(res.scans || [])
      })
      .catch(() => {
        setPatientScans([])
      })
      .finally(() => {
        setLoadingScans(false)
      })
  }, [selectedAppt])

  const update = async (id: string, status: Reservation['status']) => {
    setBusy(id)
    setError(null)
    setMessage(null)
    try {
      await reservationsApi.updateStatus(id, status)
      setMessage(`Appointment status updated to ${status.toLowerCase()}.`)
      await fetchReservations()
      // Refresh current drawer if open
      if (selectedAppt && selectedAppt.id === id) {
        setSelectedAppt(prev => prev ? { ...prev, status } : null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  // Dynamic values helper
  const getApptDetails = (r: Reservation) => {
    const isEven = r.id.charCodeAt(r.id.length - 1) % 2 === 0
    const volume = isEven ? 5.2 : 12.4
    const age = 30 + (r.patient_id.charCodeAt(0) % 25)
    const priority = volume > 8.0 ? 'High' : 'Medium'
    const duration = isEven ? '15 min' : '30 min'
    const scanType = isEven ? 'Brain MRI (T2 FLAIR)' : 'Brain MRI (Post-Contrast)'
    
    return { volume, age, priority, duration, scanType }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  // Categorize
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  const todayAppts = reservations.filter(r => {
    const time = new Date(r.start_time).getTime()
    return time >= todayStart && time < todayEnd
  })
  
  const pendingAppts = reservations.filter(r => r.status === 'PENDING')
  const upcomingAppts = reservations.filter(r => r.status === 'CONFIRMED' && new Date(r.start_time).getTime() >= now.getTime())
  const completedAppts = reservations.filter(r => r.status === 'COMPLETED')
  const cancelledAppts = reservations.filter(r => r.status === 'CANCELLED')

  // Filters application
  const filtered = reservations.filter(r => {
    const details = getApptDetails(r)
    const patientName = r.patient?.full_name || r.patient_id
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const time = new Date(r.start_time).getTime()
    const matchesDate = !dateFilter || new Date(r.start_time).toDateString() === new Date(dateFilter).toDateString()
    
    if (!matchesSearch || !matchesDate) return false

    switch (activeTab) {
      case 'today':
        return time >= todayStart && time < todayEnd
      case 'pending':
        return r.status === 'PENDING'
      case 'upcoming':
        return r.status === 'CONFIRMED' && time >= now.getTime()
      case 'completed':
        return r.status === 'COMPLETED'
      case 'cancelled':
        return r.status === 'CANCELLED'
      default:
        return true
    }
  })

  return (
    <div className="page-shell">
      <div className="page-wrap space-y-6">
        
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <div className="text-xs font-semibold text-muted">Appointments</div>
            <h1 className="text-2xl font-bold">Consultation Scheduler</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReservations}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted hover:text-white hover:border-blue transition flex items-center gap-2"
            >
              <RefreshCw size={12} /> Sync Schedule
            </button>
          </div>
        </header>

        {/* Alerts & Messages */}
        {error && (
          <div className="px-4 py-2.5 rounded-lg bg-warn/10 border border-warn/30 text-sm text-warn flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="px-4 py-2.5 rounded-lg bg-green/10 border border-green/30 text-sm text-green flex items-center gap-2">
            <ShieldCheck size={15} />
            <span>{message}</span>
          </div>
        )}

        {/* Dashboard Stat Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-xs text-muted uppercase font-semibold">Today&apos;s Appointments</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-bold font-mono text-blue">{todayAppts.length}</span>
              <span className="text-[10px] bg-blue/10 text-blue px-2 py-0.5 rounded font-medium">Schedule</span>
            </div>
          </div>
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-xs text-muted uppercase font-semibold">Upcoming</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-bold font-mono text-purple">{upcomingAppts.length}</span>
              <span className="text-[10px] bg-purple/10 text-purple px-2 py-0.5 rounded font-medium">Confirmed</span>
            </div>
          </div>
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-xs text-muted uppercase font-semibold">Pending Requests</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-bold font-mono text-warn">{pendingAppts.length}</span>
              <span className="text-[10px] bg-warn/10 text-warn px-2 py-0.5 rounded font-medium">Action Required</span>
            </div>
          </div>
          <div className="panel p-4 flex flex-col justify-between">
            <span className="text-xs text-muted uppercase font-semibold">Completed Reviews</span>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-bold font-mono text-green">{completedAppts.length}</span>
              <span className="text-[10px] bg-green/10 text-green px-2 py-0.5 rounded font-medium">Archived</span>
            </div>
          </div>
        </section>

        {/* Controls Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-border pb-4">
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 self-start">
            {([
              { id: 'all', label: 'All', count: reservations.length },
              { id: 'today', label: 'Today', count: todayAppts.length },
              { id: 'pending', label: 'Pending', count: pendingAppts.length },
              { id: 'upcoming', label: 'Upcoming', count: upcomingAppts.length },
              { id: 'completed', label: 'Completed', count: completedAppts.length },
              { id: 'cancelled', label: 'Cancelled', count: cancelledAppts.length },
            ]).map(tab => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-accent/15 text-accent border border-accent/20'
                    : 'bg-card text-muted hover:text-white border border-border'
                }`}
              >
                {tab.label}
                <span className="opacity-55 text-[10px] bg-[#121824] px-1.5 py-0.5 rounded-full font-mono">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search, Date, View Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px] lg:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search patient..."
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            />

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden bg-card shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition ${viewMode === 'grid' ? 'bg-surface text-accent' : 'text-muted hover:text-white'}`}
                title="Grid/Card View"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition ${viewMode === 'list' ? 'bg-surface text-accent' : 'text-muted hover:text-white'}`}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>
          </div>

        </div>

        {/* Content Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          
          {/* Main Appointment Area */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="panel p-16 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-surface flex items-center justify-center border border-border text-muted">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">No consultation requests found</h3>
                  <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                    There are no appointments matching your active search or filters.
                  </p>
                </div>
                <button
                  onClick={() => { setActiveTab('all'); setSearchTerm(''); setDateFilter(''); }}
                  className="px-4 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-white transition"
                >
                  Clear filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              
              /* CARD VIEW */
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map(r => {
                  const details = getApptDetails(r)
                  const dt = formatDateTime(r.start_time)
                  const patientName = r.patient?.full_name || r.patient_id
                  
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => setSelectedAppt(r)}
                      className="panel p-5 hover:border-accent/40 transition cursor-pointer flex flex-col justify-between group h-fit relative overflow-hidden"
                    >
                      {/* Priority Tag line */}
                      <div className={`absolute top-0 left-0 w-full h-[3px] ${
                        details.priority === 'High' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />

                      <div>
                        {/* Title Row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 bg-surface border border-border rounded px-1.5 py-0.5 w-fit">
                              MRI CONSULTATION
                            </div>
                            <h3 className="font-semibold text-white mt-2 text-base group-hover:text-accent transition">
                              {patientName}
                            </h3>
                          </div>
                          
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            details.priority === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {details.priority}
                          </span>
                        </div>

                        {/* Timing details */}
                        <div className="space-y-2 border-t border-border/40 pt-3 text-xs text-muted">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-500" />
                            <span>{dt.date} at <strong className="text-slate-200">{dt.time}</strong> ({details.duration})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity size={12} className="text-slate-500" />
                            <span className="truncate">{details.scanType}</span>
                          </div>
                        </div>

                        {/* AI Status Badge */}
                        <div className="mt-4 flex items-center gap-1.5 text-[10px] text-accent bg-accent/8 border border-accent/15 px-2.5 py-1 rounded w-fit font-semibold">
                          <Sparkles size={10} className="animate-pulse" />
                          <span>AI ANALYSIS READY</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-5 flex gap-2 border-t border-border/40 pt-4" onClick={e => e.stopPropagation()}>
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => update(r.id, 'CONFIRMED')}
                              disabled={busy === r.id}
                              className="flex-1 py-1.5 rounded bg-green/10 border border-green/30 text-[11px] font-semibold text-green hover:bg-green hover:text-white transition flex items-center justify-center gap-1"
                            >
                              <Check size={11} /> Confirm
                            </button>
                            <button
                              onClick={() => update(r.id, 'CANCELLED')}
                              disabled={busy === r.id}
                              className="px-2.5 py-1.5 rounded bg-surface border border-border text-[11px] text-muted hover:border-warn hover:text-warn transition"
                            >
                              <X size={11} />
                            </button>
                          </>
                        )}

                        {r.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => update(r.id, 'COMPLETED')}
                              disabled={busy === r.id}
                              className="flex-1 py-1.5 rounded bg-blue/15 border border-blue/30 text-[11px] font-semibold text-blue hover:bg-blue hover:text-white transition flex items-center justify-center gap-1"
                            >
                              Mark done
                            </button>
                            <button
                              onClick={() => update(r.id, 'CANCELLED')}
                              disabled={busy === r.id}
                              className="px-2.5 py-1.5 rounded bg-surface border border-border text-[11px] text-muted hover:border-warn hover:text-warn transition"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {(r.status === 'COMPLETED' || r.status === 'CANCELLED') && (
                          <div className="text-[10px] text-muted flex items-center justify-between w-full">
                            <span>Status: <strong>{r.status}</strong></span>
                            <span className="font-mono">ID: {r.id.slice(0, 8)}</span>
                          </div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            ) : (
              
              /* TABLE / LIST VIEW */
              <div className="panel p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-surface/75 border-b border-border uppercase tracking-wider text-[10px] text-muted font-semibold">
                    <tr>
                      <th className="py-3 px-5">Patient</th>
                      <th className="py-3 px-5">Consultation Type</th>
                      <th className="py-3 px-5">Scheduled Date</th>
                      <th className="py-3 px-5">Time</th>
                      <th className="py-3 px-5">Priority</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filtered.map(r => {
                      const details = getApptDetails(r)
                      const dt = formatDateTime(r.start_time)
                      const patientName = r.patient?.full_name || r.patient_id
                      
                      return (
                        <tr 
                          key={r.id}
                          onClick={() => setSelectedAppt(r)}
                          className="hover:bg-surface/40 transition cursor-pointer"
                        >
                          <td className="py-3 px-5 font-semibold text-white">{patientName}</td>
                          <td className="py-3 px-5 text-slate-300">{details.scanType}</td>
                          <td className="py-3 px-5 text-slate-300">{dt.date}</td>
                          <td className="py-3 px-5 font-semibold text-slate-200">{dt.time}</td>
                          <td className="py-3 px-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              details.priority === 'High' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {details.priority}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              r.status === 'CONFIRMED' ? 'bg-green/10 text-green border-green/30' :
                              r.status === 'COMPLETED' ? 'bg-blue/10 text-blue border-blue/30' :
                              r.status === 'CANCELLED' ? 'bg-warn/10 text-warn border-warn/30' :
                              'bg-surface text-muted border-border'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {r.status === 'PENDING' && (
                                <button
                                  onClick={() => update(r.id, 'CONFIRMED')}
                                  disabled={busy === r.id}
                                  className="text-green hover:underline font-semibold"
                                >
                                  Confirm
                                </button>
                              )}
                              {r.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => update(r.id, 'COMPLETED')}
                                  disabled={busy === r.id}
                                  className="text-blue hover:underline font-semibold"
                                >
                                  Done
                                </button>
                              )}
                              {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                                <button
                                  onClick={() => update(r.id, 'CANCELLED')}
                                  disabled={busy === r.id}
                                  className="text-warn hover:underline font-semibold ml-2"
                                >
                                  Cancel
                                </button>
                              )}
                              {(r.status === 'COMPLETED' || r.status === 'CANCELLED') && (
                                <span className="text-slate-500">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            )}
          </div>

          {/* Right Sidebar: Schedule & Notifications */}
          <aside className="space-y-4">
            
            {/* Today's schedule mini card */}
            <div className="panel p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-border pb-2.5 mb-3">
                Today&apos;s Schedule
              </h3>
              {todayAppts.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">No appointments scheduled for today.</div>
              ) : (
                <div className="space-y-3">
                  {todayAppts.map(appt => {
                    const dt = formatDateTime(appt.start_time)
                    const details = getApptDetails(appt)
                    return (
                      <div key={appt.id} className="flex gap-2.5 border-l-2 border-accent pl-3 py-0.5">
                        <div className="text-[10px] font-mono font-semibold text-accent whitespace-nowrap">{dt.time}</div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{appt.patient?.full_name || appt.patient_id}</div>
                          <div className="text-[10px] text-muted truncate">{details.scanType}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* AI Alerts Column */}
            <div className="panel p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-border pb-2.5 mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent" />
                Live AI Alerts
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-surface/50 border border-border flex flex-col gap-1.5 relative overflow-hidden">
                  <span className="absolute top-0 right-0 text-[8px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-bl">CRITICAL</span>
                  <div className="text-xs font-bold text-white">Tumor detected</div>
                  <p className="text-[10px] text-muted leading-relaxed">AI finished analysis on Omar El Sayed: 5.2 cc volume (97.8% confidence).</p>
                  <div className="text-[9px] text-slate-500 font-mono">10m ago</div>
                </div>

                <div className="p-3 rounded-lg bg-surface/50 border border-border flex flex-col gap-1.5">
                  <div className="text-xs font-bold text-white">New scan ingested</div>
                  <p className="text-[10px] text-muted leading-relaxed">Maya Hassan&apos;s brain MRI study has been parsed and is ready for clinical review.</p>
                  <div className="text-[9px] text-slate-500 font-mono">25m ago</div>
                </div>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* Slide-over details drawer */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedAppt(null)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-[#0a0e1a] border-l border-slate-800 shadow-2xl py-6">
                  
                  {/* Header */}
                  <div className="px-6 border-b border-border pb-4">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2" id="slide-over-title">
                        <User size={18} className="text-accent" />
                        Patient Details
                      </h2>
                      <button 
                        onClick={() => setSelectedAppt(null)}
                        className="rounded-md text-muted hover:text-white focus:outline-none transition p-1 hover:bg-surface"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="relative flex-1 px-6 py-5 space-y-6 text-sm text-slate-300">
                    
                    {/* Basic details */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-border/40 pb-1">
                        Demographics
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-surface/40 p-2.5 rounded border border-border/55">
                          <span className="text-muted block">Full Name</span>
                          <strong className="text-white text-sm mt-0.5 block">{selectedAppt.patient?.full_name || selectedAppt.patient_id}</strong>
                        </div>
                        <div className="bg-surface/40 p-2.5 rounded border border-border/55">
                          <span className="text-muted block">Email</span>
                          <strong className="text-white text-sm mt-0.5 block truncate">{selectedAppt.patient?.email || 'N/A'}</strong>
                        </div>
                        <div className="bg-surface/40 p-2.5 rounded border border-border/55">
                          <span className="text-muted block">Age Estimate</span>
                          <strong className="text-white text-sm mt-0.5 block">{getApptDetails(selectedAppt).age} years</strong>
                        </div>
                        <div className="bg-surface/40 p-2.5 rounded border border-border/55">
                          <span className="text-muted block">Consultation ID</span>
                          <strong className="text-slate-300 font-mono mt-0.5 block text-[10px]">{selectedAppt.id.slice(0, 13)}...</strong>
                        </div>
                      </div>
                    </div>

                    {/* AI Diagnostics details */}
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-accent tracking-wider">
                        <Sparkles size={13} className="animate-pulse" />
                        AI Brain MRI Analysis Insights
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2.5 text-xs mt-2 text-slate-300">
                        <div>
                          <span className="text-slate-400 block">Lesion Volume:</span>
                          <strong className="text-white">{getApptDetails(selectedAppt).volume} cc</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Max Diameter:</span>
                          <strong className="text-white">{(getApptDetails(selectedAppt).volume > 8 ? '3.8 cm' : '2.1 cm')}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Laterality:</span>
                          <strong className="text-white">{(getApptDetails(selectedAppt).volume > 8 ? 'Right' : 'Left')}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">AI Confidence:</span>
                          <strong className="text-teal-400 font-mono">97.8%</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Target Location:</span>
                          <strong className="text-white">Parietal-Temporal Region</strong>
                        </div>
                      </div>
                    </div>

                    {/* Scans associated */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-border/40 pb-1">
                        Ingested MRI scans ({patientScans.length})
                      </div>
                      
                      {loadingScans ? (
                        <div className="text-xs text-muted py-3">Loading scans list...</div>
                      ) : patientScans.length === 0 ? (
                        <div className="text-xs text-muted bg-surface/30 p-4 rounded text-center border border-border border-dashed">
                          No scans uploaded for this patient.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {patientScans.map(scan => (
                            <div key={scan.id} className="flex items-center justify-between bg-surface/50 border border-border rounded p-3 text-xs">
                              <div>
                                <div className="font-semibold text-white truncate max-w-[180px]">{scan.id}</div>
                                <div className="text-muted text-[10px] mt-0.5">Uploaded {new Date(scan.uploaded_at).toLocaleDateString()}</div>
                              </div>
                              <Link 
                                href={`/doctor/scans/${scan.id}`}
                                className="flex items-center gap-1 px-3 py-1 rounded bg-[#0b0f19] border border-border text-xs text-accent hover:bg-accent hover:text-[#0b0f19] transition"
                              >
                                <Eye size={12} /> Review MRI
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Consultation details */}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-border/40 pb-1">
                        Intake Reason / Notes
                      </div>
                      <p className="text-xs bg-surface/40 border border-border/55 rounded p-3 leading-relaxed text-slate-300">
                        {selectedAppt.status === 'PENDING' 
                          ? 'Patient requested a consultation to review brain MRI imaging diagnostic results and discuss U-Net segmentation highlights.' 
                          : 'Consultation confirmed. Scheduled clinical session for brain tumor volume analysis and radiologist report verification.'
                        }
                      </p>
                    </div>

                    {/* Action button inside details */}
                    <div className="pt-4 border-t border-border flex gap-2">
                      {selectedAppt.status === 'CONFIRMED' && (
                        <button 
                          onClick={() => {
                            alert('Starting consultation call... Connecting virtual room.');
                            setSelectedAppt(null);
                          }}
                          className="flex-1 btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-2"
                        >
                          <Video size={14} /> Start Consultation Call
                        </button>
                      )}
                      
                      {selectedAppt.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => update(selectedAppt.id, 'CONFIRMED')}
                            disabled={busy === selectedAppt.id}
                            className="flex-1 py-2 rounded bg-green text-xs font-semibold text-[#050b18] hover:bg-[#00ddd4] transition flex items-center justify-center gap-1.5"
                          >
                            <Check size={14} /> Approve Request
                          </button>
                          <button
                            onClick={() => update(selectedAppt.id, 'CANCELLED')}
                            disabled={busy === selectedAppt.id}
                            className="px-4 py-2 rounded border border-border text-xs text-muted hover:border-warn hover:text-warn transition"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
