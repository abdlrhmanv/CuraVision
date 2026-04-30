'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import {
  ApiError,
  AuthUser,
  Reservation,
  reservationsApi,
} from '@/lib/apiClient'

type Slot = { start_time: string; end_time: string }

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

export default function PatientAppointmentsPage() {
  const { user, loading } = useRequireAuth('PATIENT')
  const [doctors, setDoctors] = useState<AuthUser[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [doctorId, setDoctorId] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchReservations = async () => {
    try {
      const res = await reservationsApi.list()
      setReservations(
        res.reservations.slice().sort(
          (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        )
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load reservations')
    }
  }

  const fetchSlots = async (id: string) => {
    if (!id) {
      setSlots([])
      return
    }
    setSlotsLoading(true)
    setError(null)
    try {
      const now = new Date()
      const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      const res = await reservationsApi.doctorAvailability(
        id,
        now.toISOString(),
        to.toISOString()
      )
      setSlots(res.slots)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load availability')
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (loading || !user) return
    ;(async () => {
      try {
        const list = await reservationsApi.listDoctors()
        setDoctors(list.doctors)
        if (list.doctors[0]) {
          setDoctorId(list.doctors[0].id)
          fetchSlots(list.doctors[0].id)
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load doctors')
      }
      fetchReservations()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const doctorById = useMemo(() => {
    const m = new Map<string, AuthUser>()
    for (const d of doctors) m.set(d.id, d)
    return m
  }, [doctors])

  const handleDoctorChange = (id: string) => {
    setDoctorId(id)
    fetchSlots(id)
  }

  const handleBook = async (slot: Slot) => {
    if (!doctorId) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await reservationsApi.book(doctorId, slot.start_time, slot.end_time)
      setMessage('Appointment requested. You will be notified when the doctor confirms it.')
      fetchReservations()
      fetchSlots(doctorId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book the slot')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async (id: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await reservationsApi.updateStatus(id, 'CANCELLED')
      setMessage('Appointment cancelled.')
      fetchReservations()
      if (doctorId) fetchSlots(doctorId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel the appointment')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <>
      <div className="mb-6">
        <div className="text-[10px] tracking-[2px] uppercase text-muted font-semibold mb-1">
          Appointments
        </div>
        <h1 className="text-2xl font-extrabold">Book a consultation</h1>
        <p className="text-sm text-muted mt-1">
          Pick a doctor and an available slot. Your request will be marked
          <span className="text-white"> PENDING</span> until the doctor confirms it.
        </p>
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

      <div className="grid lg:grid-cols-[2fr_3fr] gap-5 mb-10">
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="block text-[10px] uppercase tracking-wide text-muted mb-2">
            Doctor
          </label>
          <select
            value={doctorId}
            onChange={(e) => handleDoctorChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
          >
            {doctors.length === 0 && <option>No doctors available</option>}
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-3 flex items-center gap-2">
            <Clock size={12} />
            Slots shown for the next 14 days.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Available slots
            </div>
            <button
              type="button"
              onClick={() => doctorId && fetchSlots(doctorId)}
              className="text-xs text-muted hover:text-white flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          {slotsLoading ? (
            <p className="text-sm text-muted">Loading availability...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">
              No open slots for this doctor in the next 14 days.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-[340px] overflow-auto pr-1">
              {slots.map((s) => (
                <button
                  key={s.start_time}
                  onClick={() => handleBook(s)}
                  disabled={busy}
                  className="text-left px-3 py-2 rounded-lg bg-surface border border-border hover:border-accent transition disabled:opacity-50"
                >
                  <div className="text-sm font-semibold">{formatDateTime(s.start_time)}</div>
                  <div className="text-[11px] text-muted">
                    {new Date(s.end_time).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    finish
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Calendar size={14} className="text-muted" />
        <h2 className="text-sm font-semibold">My appointments</h2>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {reservations.length === 0 ? (
          <p className="p-5 text-sm text-muted">No appointments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface/70 border-b border-border">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                  Doctor
                </th>
                <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                  When
                </th>
                <th className="text-left py-2 px-4 font-semibold text-muted text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 font-medium">
                    {doctorById.get(r.doctor_id)?.full_name ?? r.doctor_id}
                  </td>
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
                  <td className="py-3 px-4 text-right">
                    {r.status === 'PENDING' || r.status === 'CONFIRMED' ? (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={busy}
                        className="text-xs text-warn hover:underline flex items-center gap-1 ml-auto disabled:opacity-50"
                      >
                        <XCircle size={12} /> Cancel
                      </button>
                    ) : r.status === 'COMPLETED' ? (
                      <CheckCircle2 size={14} className="text-blue ml-auto" />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
