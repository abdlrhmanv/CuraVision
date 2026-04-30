'use client'

import { useEffect, useState } from 'react'
import { Calendar, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import {
  ApiError,
  Reservation,
  reservationsApi,
} from '@/lib/apiClient'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusTone(status: Reservation['status']): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green/10 text-green border-green/30'
    case 'CANCELLED':
      return 'bg-warn/10 text-warn border-warn/30'
    case 'COMPLETED':
      return 'bg-blue/10 text-blue border-blue/30'
    default:
      return 'bg-surface text-muted border-border'
  }
}

interface SectionProps {
  title: string
  items: Reservation[]
  emptyText: string
  showActions?: boolean
  busy: string | null
  onUpdate: (id: string, status: Reservation['status']) => void
}

function Section({
  title,
  items,
  emptyText,
  showActions = false,
  busy,
  onUpdate,
}: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div className="px-5 py-3 bg-surface/70 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calendar size={14} /> {title}
          <span className="text-xs text-muted">({items.length})</span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface/40 border-b border-border">
            <tr>
              <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                Patient
              </th>
              <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                When
              </th>
              <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                Status
              </th>
              {showActions && <th className="text-right py-2 px-4" />}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 px-4 font-mono text-xs">{r.patient_id}</td>
                <td className="py-3 px-4">{formatDateTime(r.start_time)}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusTone(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                </td>
                {showActions && (
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => onUpdate(r.id, 'CONFIRMED')}
                          disabled={busy === r.id}
                          className="text-xs text-green hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Confirm
                        </button>
                      )}
                      {r.status === 'CONFIRMED' && (
                        <button
                          onClick={() => onUpdate(r.id, 'COMPLETED')}
                          disabled={busy === r.id}
                          className="text-xs text-blue hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Mark done
                        </button>
                      )}
                      {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                        <button
                          onClick={() => onUpdate(r.id, 'CANCELLED')}
                          disabled={busy === r.id}
                          className="text-xs text-warn hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function DoctorAppointmentsPage() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchReservations = async () => {
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
  }

  useEffect(() => {
    if (loading || !user) return
    fetchReservations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const update = async (id: string, status: Reservation['status']) => {
    setBusy(id)
    setError(null)
    setMessage(null)
    try {
      await reservationsApi.updateStatus(id, status)
      setMessage(`Reservation ${status.toLowerCase()}.`)
      fetchReservations()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  const pending = reservations.filter((r) => r.status === 'PENDING')
  const upcoming = reservations.filter(
    (r) => r.status === 'CONFIRMED' && new Date(r.end_time) >= new Date()
  )
  const history = reservations.filter(
    (r) =>
      r.status === 'CANCELLED' ||
      r.status === 'COMPLETED' ||
      (r.status === 'CONFIRMED' && new Date(r.end_time) < new Date())
  )

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-1">
            Appointments
          </div>
          <h1 className="text-2xl font-extrabold">Consultation requests</h1>
        </div>
        <button
          onClick={fetchReservations}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted hover:text-white hover:border-blue transition flex items-center gap-2"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-3 px-3 py-2 rounded-md bg-green/10 border border-green/30 text-sm text-green">
          {message}
        </div>
      )}

      <Section
        title="Pending confirmation"
        items={pending}
        emptyText="No pending requests."
        showActions
        busy={busy}
        onUpdate={update}
      />
      <Section
        title="Upcoming"
        items={upcoming}
        emptyText="No upcoming appointments."
        showActions
        busy={busy}
        onUpdate={update}
      />
      <Section
        title="History"
        items={history}
        emptyText="No past appointments."
        busy={busy}
        onUpdate={update}
      />
    </>
  )
}
