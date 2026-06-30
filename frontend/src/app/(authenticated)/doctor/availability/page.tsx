'use client'

import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2, Clock } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { reservationsApi, AvailabilityRule, ApiError } from '@/lib/apiClient'
import Swal from 'sweetalert2'

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default function DoctorAvailability() {
  const { user, loading } = useRequireAuth('DOCTOR')
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [dayOfWeek, setDayOfWeek] = useState(1) // Default Monday
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [submitting, setSubmitting] = useState(false)

  const fetchRules = async (doctorId: string) => {
    setFetching(true)
    try {
      const res = await reservationsApi.getRules(doctorId)
      setRules(res.rules)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch availability rules')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (loading || !user) return
    fetchRules(user.id)
  }, [loading, user])

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSubmitting(true)

    try {
      await reservationsApi.createRule(user.id, {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      })
      
      // Notify success
      Swal.fire({
        title: 'Success!',
        text: 'Availability slot added successfully.',
        icon: 'success',
        confirmButtonColor: '#4F8EFF',
        background: '#0D1526',
        color: '#ECF0FA',
      })

      fetchRules(user.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add availability rule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!user) return

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the availability slot and prevent patients from booking during this time.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#FF6B5B',
      cancelButtonColor: '#1A2844',
      background: '#0D1526',
      color: '#ECF0FA',
    })

    if (!confirm.isConfirmed) return

    try {
      await reservationsApi.deleteRule(user.id, ruleId)
      setRules(rules.filter((r) => r.id !== ruleId))
      
      Swal.fire({
        title: 'Deleted!',
        text: 'The availability slot has been removed.',
        icon: 'success',
        confirmButtonColor: '#4F8EFF',
        background: '#0D1526',
        color: '#ECF0FA',
      })
    } catch (err) {
      Swal.fire({
        title: 'Error!',
        text: err instanceof ApiError ? err.message : 'Failed to delete slot',
        icon: 'error',
        confirmButtonColor: '#FF6B5B',
        background: '#0D1526',
        color: '#ECF0FA',
      })
    }
  }

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-accent w-8 h-8" />
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Manage Availability</h2>
          <p className="text-sm text-muted">Set up rules for when patients can schedule appointments with you</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Slot Form */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-text">
              <Plus size={16} className="text-accent" /> Add Availability Slot
            </h3>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Day of the Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue bg-surface text-text"
                >
                  {DAYS.map((name, index) => (
                    <option key={index} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue bg-surface text-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue bg-surface text-text"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-accent text-[#050B18] text-xs font-bold hover:bg-[#00ddd4] transition disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Slot'}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Slots List */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-5 min-h-[300px]">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-text">
              <Clock size={16} className="text-blue" /> Current Availability Slots
            </h3>

            {fetching ? (
              <div className="text-sm text-muted">Loading...</div>
            ) : rules.length === 0 ? (
              <div className="text-sm text-muted py-12 text-center">
                You have not set any availability slots yet. Patients will not be able to book appointments with you until you add at least one slot.
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-surface border border-border rounded-lg p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-sm font-bold text-accent mr-3">
                        {DAYS[rule.day_of_week]}
                      </span>
                      <span className="text-sm text-text font-mono">
                        {rule.start_time} – {rule.end_time}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-md hover:bg-warn/10 text-muted hover:text-warn transition"
                      title="Delete slot"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
