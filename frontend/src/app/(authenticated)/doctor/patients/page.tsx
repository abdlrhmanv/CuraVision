"use client"

import { useState } from 'react'
import {
  Check, MessageSquare, ScanLine, AlertCircle, Clock3, ShieldCheck, X,
  Eye, EyeOff, Bot, User, ChevronLeft, ChevronRight, Brain, Search, ClipboardList
} from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'

interface ChatMessage {
  role: 'patient' | 'bot'
  text: string
  time?: string
}

interface Patient {
  id: number
  name: string
  age: number
  condition: string
  status: string
  priority: string
  lastReviewed: string
  suggestion: string
  chatHistory: ChatMessage[]
}

type Decision = 'accept' | 'decline' | null
type ReviewStatus = 'accepted' | 'denied' | 'in-review'

interface ReviewState {
  decision: Decision
  comment: string
  confirmed: boolean
}

const EMPTY_REVIEW: ReviewState = { decision: null, comment: '', confirmed: false }

const patients: Patient[] = [
  { id: 1, name: 'Maya Hassan', age: 34, condition: 'Neurological follow-up', status: 'Awaiting review', priority: 'Follow-up needed', lastReviewed: '10 mins ago', suggestion: 'Review imaging and consider follow-up.', chatHistory: [{ role: 'patient', text: 'Headache and blurred vision.', time: '9:14 AM' }, { role: 'bot', text: 'Consider follow-up imaging.', time: '9:14 AM' }] },
  { id: 2, name: 'Omar El Sayed', age: 41, condition: 'Post-contrast evaluation', status: 'Ready for sign-off', priority: 'High priority', lastReviewed: '32 mins ago', suggestion: 'Verify report vs symptoms.', chatHistory: [{ role: 'patient', text: 'Dizziness after scan.', time: '8:52 AM' }, { role: 'bot', text: 'Summarize for clinician.', time: '8:53 AM' }] },
]

function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function priorityClasses(priority: string) {
  if (priority.toLowerCase().includes('high')) return 'bg-red-500/10 text-red-400'
  return 'bg-warn/10 text-warn'
}

function reviewBadgeClasses(status: ReviewStatus) {
  if (status === 'accepted') return 'bg-green/10 text-green'
  if (status === 'denied') return 'bg-red-500/10 text-red-400'
  return 'bg-blue/10 text-blue'
}

function reviewLabel(status: ReviewStatus) {
  if (status === 'accepted') return 'Accepted'
  if (status === 'denied') return 'Denied'
  return 'In review'
}

function ReviewIcon({ status, size = 10 }: { status: ReviewStatus; size?: number }) {
  if (status === 'accepted') return <Check size={size} />
  if (status === 'denied') return <X size={size} />
  return <Clock3 size={size} />
}

type StatusFilter = 'all' | ReviewStatus

export default function DoctorPatientsPage() {
  const { user, loading } = useRequireAuth('DOCTOR')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showXray, setShowXray] = useState(false)

  // Decision state lives per-patient now, so switching patients doesn't wipe it out
  const [reviews, setReviews] = useState<Record<number, ReviewState>>({})

  const selected = patients.find(p => p.id === selectedId)

  function getReview(id: number): ReviewState {
    return reviews[id] ?? EMPTY_REVIEW
  }

  function updateReview(id: number, patch: Partial<ReviewState>) {
    setReviews(prev => ({ ...prev, [id]: { ...getReview(id), ...patch } }))
  }

  function reviewStatus(id: number): ReviewStatus {
    const r = getReview(id)
    if (r.confirmed && r.decision === 'accept') return 'accepted'
    if (r.confirmed && r.decision === 'decline') return 'denied'
    return 'in-review'
  }

  const acceptedCount = patients.filter(p => reviewStatus(p.id) === 'accepted').length
  const deniedCount = patients.filter(p => reviewStatus(p.id) === 'denied').length
  const inReviewCount = patients.filter(p => reviewStatus(p.id) === 'in-review').length

  const filteredPatients = patients.filter(p => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch = !term || p.name.toLowerCase().includes(term) || p.condition.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'all' || reviewStatus(p.id) === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  function selectPatient(id: number) {
    setSelectedId(id)
    setShowXray(false)
  }

  function closeDetail() {
    setSelectedId(null)
    setShowXray(false)
  }

  if (patients.length === 0) {
    return (
      <div className="page-shell">
        <div className="page-wrap py-16 text-center text-muted">No patients currently in the queue.</div>
      </div>
    )
  }

  const review = selected ? getReview(selected.id) : EMPTY_REVIEW

  return (
    <div className="page-shell">
      <div className="page-wrap space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <div className="text-xs font-semibold text-muted">Clinical Review</div>
            <h1 className="text-2xl font-bold">Patient Queue</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={14} />
              {patients.length} in queue
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              Updated
            </span>
          </div>
        </header>

        {/* Sidebar trimmed to 260px so Conversation + AI panels get more room */}
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <aside className={`space-y-3 ${selected ? 'hidden xl:block' : 'block'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold uppercase tracking-[2px] text-muted">Queue</div>
              <span className="text-[10px] text-muted whitespace-nowrap">{filteredPatients.length} shown</span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients..."
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {([
                { key: 'all', label: 'All', count: patients.length },
                { key: 'in-review', label: 'In review', count: inReviewCount },
                { key: 'accepted', label: 'Accepted', count: acceptedCount },
                { key: 'denied', label: 'Denied', count: deniedCount },
              ] as const).map(f => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition whitespace-nowrap ${
                    statusFilter === f.key
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-card text-muted border border-border hover:text-white'
                  }`}
                >
                  {f.label} <span className="opacity-60">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 pt-1">
              {filteredPatients.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
                  No patients match your filters.
                </div>
              )}

              {filteredPatients.map(p => {
                const status = reviewStatus(p.id)
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => selectPatient(p.id)}
                    aria-pressed={p.id === selectedId}
                    className={`group w-full rounded-xl p-3 text-left transition ${
                      p.id === selectedId ? 'ring-2 ring-accent/40 bg-accent/6' : 'hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 text-white text-sm font-bold">
                        {initials(p.name)}
                        <span
                          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#080E1C] ${
                            p.priority.toLowerCase().includes('high') ? 'bg-red-400' : 'bg-warn'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate text-sm">{p.name}</div>
                        <div className="text-xs text-muted truncate">{p.condition}</div>
                      </div>
                      <ChevronRight size={14} className="mt-1 shrink-0 text-muted opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`flex items-center gap-1 text-[10px] rounded-full px-2 py-1 font-semibold uppercase whitespace-nowrap ${reviewBadgeClasses(status)}`}>
                        <ReviewIcon status={status} />
                        {reviewLabel(status)}
                      </span>
                      <span className="text-[10px] text-muted whitespace-nowrap">{p.lastReviewed}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <main className={`space-y-4 ${selected ? 'block' : 'hidden xl:block'}`}>
            {!selected && (
              <div className="panel flex flex-col items-center justify-center text-center gap-4 p-12 min-h-[520px]">
                <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <ClipboardList size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Select a patient to begin</h3>
                  <p className="mt-1 text-base text-muted max-w-sm">
                    Choose a patient from the queue to review their intake conversation, AI recommendation, and imaging.
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-md">
                  <div className="panel-soft p-3">
                    <div className="text-2xl font-bold text-blue">{inReviewCount}</div>
                    <div className="text-[11px] text-muted uppercase tracking-[1px]">In review</div>
                  </div>
                  <div className="panel-soft p-3">
                    <div className="text-2xl font-bold text-green">{acceptedCount}</div>
                    <div className="text-[11px] text-muted uppercase tracking-[1px]">Accepted</div>
                  </div>
                  <div className="panel-soft p-3">
                    <div className="text-2xl font-bold text-red-400">{deniedCount}</div>
                    <div className="text-[11px] text-muted uppercase tracking-[1px]">Denied</div>
                  </div>
                </div>
              </div>
            )}

            {selected && (
              <>
                <div className="panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={closeDetail}
                        aria-label="Back to queue"
                        className="xl:hidden h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-card border border-border text-muted hover:text-white transition"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 text-white text-xl font-bold">
                        {initials(selected.name)}
                      </div>
                      <div>
                        <div className="text-sm text-muted">Selected patient</div>
                        <div className="text-xl font-semibold">{selected.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[1px] whitespace-nowrap ${reviewBadgeClasses(reviewStatus(selected.id))}`}>
                        <ReviewIcon status={reviewStatus(selected.id)} size={12} />
                        {reviewLabel(reviewStatus(selected.id))}
                      </span>
                      <div className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[1px] whitespace-nowrap ${priorityClasses(selected.priority)}`}>
                        {selected.priority}
                      </div>
                      <button type="button" className="btn-outline">Open record</button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="panel-soft p-3">
                      <div className="text-[10px] text-muted uppercase tracking-[1px]">Age</div>
                      <div className="mt-2 font-semibold text-white">{selected.age} years</div>
                    </div>
                    <div className="panel-soft p-3">
                      <div className="text-[10px] text-muted uppercase tracking-[1px]">Clinical status</div>
                      <div className="mt-2 font-semibold text-white">{selected.status}</div>
                    </div>
                    <div className="panel-soft p-3">
                      <div className="text-[10px] text-muted uppercase tracking-[1px]">Last reviewed</div>
                      <div className="mt-2 font-semibold text-white">{selected.lastReviewed}</div>
                    </div>
                  </div>
                </div>

                {/* Conversation now gets ~58% of the width, AI rec + MRI column gets the rest */}
                <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                  <section className="panel p-0 flex flex-col h-full overflow-hidden min-h-[560px]">
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={closeDetail}
                          aria-label="Back to queue"
                          className="xl:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-card border border-border text-muted hover:text-white transition"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold leading-tight truncate">Intake Conversation</h3>
                          <p className="text-xs text-muted truncate">Grounded in {selected.name}&apos;s intake</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap shrink-0">
                        <span className="h-2 w-2 rounded-full bg-green" />
                        Live
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 bg-surface/30">
                      {selected.chatHistory.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                          <Brain size={40} className="text-accent" />
                          <p className="text-muted">No intake conversation recorded yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selected.chatHistory.map((m, i) => {
                            const isBot = m.role === 'bot'
                            return (
                              <div key={i} className={`flex items-end gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}>
                                <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full ${isBot ? 'bg-accent/15 text-accent' : 'bg-slate-700 text-slate-200'}`}>
                                  {isBot ? <Bot size={15} /> : <User size={15} />}
                                </div>
                                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${isBot ? 'bg-blue/10 text-blue border border-blue/20 rounded-bl-sm' : 'bg-card border border-border text-white rounded-br-sm'}`}>
                                  <div className="text-base leading-relaxed">{m.text}</div>
                                  {m.time && <div className="mt-1 text-[10px] opacity-60">{m.time}</div>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border px-5 py-4 bg-surface/50">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-muted">
                          Conversation paused for clinical review
                        </div>
                        <button
                          type="button"
                          disabled
                          className="flex items-center gap-2 rounded-full bg-accent/30 px-5 py-2.5 text-sm font-semibold text-accent/60 cursor-not-allowed whitespace-nowrap"
                        >
                          <MessageSquare size={14} /> Resume
                        </button>
                      </div>
                      <p className="mt-2 text-center text-[11px] text-muted">
                        AI responses are informational only — clinical decisions require physician sign-off.
                      </p>
                    </div>
                  </section>

                  <aside className="space-y-4">
                    <div className="panel p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">AI recommendation</h3>
                          <p className="text-base text-muted mt-1">Suggested next step</p>
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] rounded-full px-2 py-1 font-semibold whitespace-nowrap ${reviewBadgeClasses(reviewStatus(selected.id))}`}>
                          <ReviewIcon status={reviewStatus(selected.id)} />
                          {reviewLabel(reviewStatus(selected.id))}
                        </span>
                      </div>

                      <div className="mt-5 rounded-lg border border-border bg-surface p-4">
                        <p className="text-base text-muted leading-relaxed">{selected.suggestion}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateReview(selected.id, { decision: 'accept' })}
                            disabled={review.confirmed}
                            aria-pressed={review.decision === 'accept'}
                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${review.decision === 'accept' ? 'bg-green/15 text-green border border-green/25' : 'bg-card text-muted border border-border hover:border-green hover:text-green'}`}
                          >
                            <Check size={14} /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateReview(selected.id, { decision: 'decline' })}
                            disabled={review.confirmed}
                            aria-pressed={review.decision === 'decline'}
                            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${review.decision === 'decline' ? 'bg-warn/15 text-warn border border-warn/25' : 'bg-card text-muted border border-border hover:border-warn hover:text-warn'}`}
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                        <div className="mt-4">
                          <label className="text-sm font-semibold mb-2 block">Comment</label>
                          <textarea
                            value={review.comment}
                            onChange={(e) => updateReview(selected.id, { comment: e.target.value })}
                            rows={3}
                            disabled={review.confirmed}
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted disabled:opacity-50"
                            placeholder="Add a clinical note"
                          />
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => { if (review.decision) updateReview(selected.id, { confirmed: true }) }}
                              disabled={!review.decision || review.confirmed}
                              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Confirm decision
                            </button>
                            {review.confirmed && (
                              <div className="flex items-center gap-2 text-sm text-accent whitespace-nowrap">
                                <ShieldCheck size={16} /> Decision recorded
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="panel p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">MRI scan review</h3>
                          <p className="text-base text-muted mt-1">High-resolution view of current imaging</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowXray((s) => !s)}
                          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-white transition whitespace-nowrap"
                        >
                          {showXray ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showXray ? 'Hide' : 'Show'} scan
                        </button>
                      </div>

                      <div className="mt-5">
                        {showXray ? (
                          <div className="h-56 w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center text-slate-200">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 text-accent mb-2"><ScanLine size={18} /> MRI Brain Scan</div>
                              <div className="text-xs uppercase tracking-[3px] text-slate-300">T2 weighted axial</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-56 w-full rounded-lg border border-dashed border-border bg-surface/60 flex items-center justify-center text-sm text-muted text-center px-4">
                            Scan hidden — click &quot;Show scan&quot; to inspect
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}