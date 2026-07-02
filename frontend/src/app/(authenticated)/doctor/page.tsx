'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { 
  Brain, Calendar as CalendarIcon, FileText, Upload, Users, 
  Activity, Clock, Bell, ChevronRight, AlertTriangle, 
  CheckCircle, PlusCircle, Video
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { AvailabilityRule, DoctorScan, Reservation, DoctorStats, reservationsApi, scansApi, doctorsApi } from '@/lib/apiClient'

function getPriority(scan: DoctorScan) {
  if (scan.report_status === 'PUBLISHED') return { label: 'Low', color: 'bg-green-500/10 text-green-500', icon: '🟢' }
  if (scan.status === 'ANALYSIS_COMPLETE' && scan.report_status !== 'PUBLISHED') return { label: 'High', color: 'bg-red-500/10 text-red-500', icon: '🔴' }
  if (scan.status === 'UPLOADING' || scan.status === 'PENDING') return { label: 'Low', color: 'bg-blue/10 text-blue', icon: '🟢' }
  return { label: 'Medium', color: 'bg-yellow-500/10 text-yellow-500', icon: '🟡' }
}

export default function DoctorDashboard() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [scans, setScans] = useState<DoctorScan[]>([])
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<DoctorStats | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading || !user) return
    const load = async () => {
      setFetching(true)
      try {
        const [scansRes, rulesRes, resRes, statsRes] = await Promise.all([
          scansApi.listForDoctor(),
          reservationsApi.getRules(user.id),
          reservationsApi.list(),
          doctorsApi.getStats(user.id)
        ])
        setScans(scansRes.scans)
        setRules(rulesRes.rules)
        // filter reservations for this doctor and only today
        const today = new Date().toISOString().split('T')[0]
        const todayRes = resRes.reservations.filter(r => 
          r.doctor_id === user.id && 
          r.start_time.startsWith(today)
        )
        setReservations(todayRes)
        setStats(statsRes)
      } catch (err) {
        console.error(err)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [loading, user])

  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const newScansCount = useMemo(() => {
    if (!now) return 0
    return scans.filter(s => new Date(s.uploaded_at).getTime() > now - 86400000).length
  }, [scans, now])

  if (loading || !user) return <div className="p-8 text-center text-sm text-muted animate-pulse">Loading Dashboard...</div>
  if (fetching && scans.length === 0) return <div className="p-8 text-center text-sm text-muted animate-pulse">Loading Data...</div>

  const pendingReviews = scans.filter((s) => s.status === 'ANALYSIS_COMPLETE' && s.report_status !== 'PUBLISHED').length
  const completedReports = scans.filter((s) => s.report_status === 'PUBLISHED').length
  const criticalCases = scans.filter((s) => s.status === 'ANALYSIS_COMPLETE' && s.report_status === 'DRAFT').length // Mocked logic for critical
  
  // Sort scans by priority for the queue
  const priorityQueue = [...scans].sort((a, b) => {
    const aPri = getPriority(a)
    const bPri = getPriority(b)
    if (aPri.label === 'High' && bPri.label !== 'High') return -1
    if (aPri.label !== 'High' && bPri.label === 'High') return 1
    if (aPri.label === 'Medium' && bPri.label === 'Low') return -1
    if (aPri.label === 'Low' && bPri.label === 'Medium') return 1
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  }).slice(0, 5)

  const recentReports = [...scans].filter(s => s.report_status).sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).slice(0, 4)

  return (
    <main className="max-w-[1400px] mx-auto space-y-6 focus:outline-none" tabIndex={-1}>
      
      {/* 1. Welcome Section */}
      <section className="bg-gradient-to-r from-[#050B18] via-surface to-accent/5 border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="z-10">
          <h1 className="text-3xl font-extrabold text-text mb-2 tracking-tight">
            Good Morning, Dr. {user.full_name.replace('Dr. ', '')} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm font-medium">
            <span className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              {pendingReviews} Pending Reviews
            </span>
            <span className="flex items-center gap-2 text-blue">
              <CalendarIcon size={16} />
              {reservations.length} Appointments Today
            </span>
            <span className="flex items-center gap-2 text-purple">
              <Brain size={16} />
              {stats?.total_ai_analyses ?? 0} AI Analyses Completed
            </span>
          </div>
        </div>
      </section>

      {/* 2. Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href="/doctor/upload" className="bg-surface border border-border hover:border-accent hover:bg-accent/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3 group-hover:scale-110 transition-transform">
            <Upload size={20} />
          </div>
          <span className="text-xs font-bold text-text">Upload Scan</span>
        </Link>
        <Link href="/doctor/scans" className="bg-surface border border-border hover:border-blue hover:bg-blue/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue mb-3 group-hover:scale-110 transition-transform">
            <PlusCircle size={20} />
          </div>
          <span className="text-xs font-bold text-text">Create Report</span>
        </Link>
        <Link href="/doctor/patients" className="bg-surface border border-border hover:border-purple hover:bg-purple/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center text-purple mb-3 group-hover:scale-110 transition-transform">
            <Users size={20} />
          </div>
          <span className="text-xs font-bold text-text">Patients</span>
        </Link>
        <Link href="/doctor/appointments" className="bg-surface border border-border hover:border-green-400 hover:bg-green-400/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center text-green-400 mb-3 group-hover:scale-110 transition-transform">
            <CalendarIcon size={20} />
          </div>
          <span className="text-xs font-bold text-text">Appointments</span>
        </Link>
        <Link href="/doctor/availability" className="bg-surface border border-border hover:border-yellow-400 hover:bg-yellow-400/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 mb-3 group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
          <span className="text-xs font-bold text-text">Availability</span>
        </Link>
        <Link href="/doctor/profile" className="bg-surface border border-border hover:border-pink-400 hover:bg-pink-400/5 transition rounded-xl p-4 flex flex-col items-center justify-center text-center group">
          <div className="w-10 h-10 rounded-full bg-pink-400/10 flex items-center justify-center text-pink-400 mb-3 group-hover:scale-110 transition-transform">
            <Brain size={20} />
          </div>
          <span className="text-xs font-bold text-text">AI Assistant</span>
        </Link>
      </section>

      {/* 3. Statistics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">{pendingReviews}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Pending Reviews</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">{reservations.length}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Today&apos;s Appts</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">{newScansCount}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">New Scans</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">{completedReports}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Completed Reports</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">{stats?.total_patients ?? 0}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Patients</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-red-400">{criticalCases}</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Critical Cases</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-text">6m</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">Avg Review Time</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-accent">95%</span>
          <span className="text-[10px] uppercase text-muted font-bold mt-1 tracking-wider">AI Accuracy</span>
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Priority Queue */}
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle size={18} className="text-warn" /> Priority Queue
              </h2>
              <Link href="/doctor/scans" className="text-xs font-semibold text-accent hover:underline">View All</Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface/50 border-b border-border text-xs uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Priority</th>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Scan</th>
                    <th className="px-5 py-3 font-semibold">AI Status</th>
                    <th className="px-5 py-3 font-semibold">Uploaded</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {priorityQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted">No pending scans in queue</td>
                    </tr>
                  ) : (
                    priorityQueue.map((s) => {
                      const pri = getPriority(s)
                      return (
                        <tr key={s.id} className="hover:bg-surface/30 transition">
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2 font-medium">
                              {pri.icon} {pri.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">{s.patient_name || 'Unknown'}</td>
                          <td className="px-5 py-3 text-muted">{s.modality}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.status === 'ANALYSIS_COMPLETE' ? 'bg-accent/10 text-accent' : 'bg-surface border border-border'}`}>
                              {s.status === 'ANALYSIS_COMPLETE' ? 'Ready' : s.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted text-xs">
                            {new Date(s.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link href={`/doctor/scans/${s.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface border border-border hover:border-accent text-xs font-bold transition">
                              Review <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Today's Appointments */}
          <section className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue" /> Today&apos;s Appointments
              </h2>
              <Link href="/doctor/appointments" className="text-xs font-semibold text-blue hover:underline">View Schedule</Link>
            </div>
            
            {reservations.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">No appointments scheduled for today.</div>
            ) : (
              <div className="space-y-3">
                {reservations.map(res => (
                  <div key={res.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:border-blue/50 transition">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-blue/10 rounded-lg border border-blue/20">
                        <div className="text-sm font-bold text-blue">{new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div>
                        <div className="font-bold text-sm">{res.patient_id.slice(0,8)}...</div> {/* Mocking patient name since reservation doesn't have it joined */}
                        <div className="text-xs text-muted flex items-center gap-2 mt-1">
                          <Video size={12} /> Tele-consultation
                        </div>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-surface border border-border text-xs font-bold hover:bg-blue hover:text-[#050B18] hover:border-blue transition">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* Recent Reports */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <FileText size={18} className="text-purple" /> Recent Reports
            </h2>
            <div className="space-y-3">
              {recentReports.length === 0 ? (
                <div className="text-sm text-muted py-4">No recent reports.</div>
              ) : (
                recentReports.map(scan => (
                  <Link key={scan.id} href={`/doctor/reports/${scan.report_id}`} className="block p-3 rounded-lg border border-border bg-surface hover:border-purple/50 transition">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-sm">{scan.patient_name || 'Unknown'}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        scan.report_status === 'PUBLISHED' ? 'bg-green-500/10 text-green-500' :
                        scan.report_status === 'REVIEWED' ? 'bg-blue/10 text-blue' :
                        'bg-surface border border-border text-muted'
                      }`}>
                        {scan.report_status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(scan.uploaded_at).toLocaleDateString()}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* AI Activity */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Activity size={18} className="text-accent" /> AI Activity
            </h2>
            <div className="space-y-4">
              <div className="border-l-2 border-accent pl-3">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={14} className="text-accent" /> Brain Tumor Detected
                </div>
                <div className="text-xs text-muted mt-1">Confidence: <span className="text-accent font-mono font-bold">96%</span></div>
              </div>
              <div className="border-l-2 border-blue pl-3">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue" /> Stroke Ischemia
                </div>
                <div className="text-xs text-muted mt-1">Confidence: <span className="text-blue font-mono font-bold">91%</span></div>
              </div>
              <div className="border-l-2 border-purple pl-3">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={14} className="text-purple" /> Glioma
                </div>
                <div className="text-xs text-muted mt-1">Confidence: <span className="text-purple font-mono font-bold">88%</span></div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Bell size={18} className="text-warn" /> Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue/10 flex items-center justify-center text-blue shrink-0">
                  <Upload size={14} />
                </div>
                <div>
                  <div className="text-sm font-medium">Patient uploaded MRI</div>
                  <div className="text-xs text-muted">5 min ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Brain size={14} />
                </div>
                <div>
                  <div className="text-sm font-medium">AI finished analysis</div>
                  <div className="text-xs text-muted">12 min ago</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-400/10 flex items-center justify-center text-green-400 shrink-0">
                  <CalendarIcon size={14} />
                </div>
                <div>
                  <div className="text-sm font-medium">Appointment starts in 30 min</div>
                  <div className="text-xs text-muted">30 min ago</div>
                </div>
              </div>
            </div>
          </section>

          {/* Mini Calendar */}
          <section className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Clock size={18} className="text-text" /> Schedule
              </h2>
              <Link href="/doctor/availability" className="text-xs font-semibold text-text hover:underline">Manage</Link>
            </div>
            {rules.length === 0 ? (
              <div className="text-sm text-muted text-center py-4">No availability set</div>
            ) : (
              <div className="space-y-2">
                {[1,2,3,4,5].map(dayNum => {
                  const dayRules = rules.filter(r => r.day_of_week === dayNum)
                  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                  return (
                    <div key={dayNum} className="flex justify-between items-center text-sm p-2 rounded bg-surface border border-border">
                      <span className="font-semibold w-12">{dayNames[dayNum]}</span>
                      {dayRules.length > 0 ? (
                        <span className="text-xs text-accent font-mono">{dayRules[0].start_time} - {dayRules[dayRules.length-1].end_time}</span>
                      ) : (
                        <span className="text-xs text-muted">Off</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  )
}
