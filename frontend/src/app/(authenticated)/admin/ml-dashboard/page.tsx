'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, Activity, Settings2, ShieldCheck, Database, ServerCrash } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import { API_BASE_URL } from '@/lib/apiClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalyticsData {
  totalScans: number;
  completedScans: number;
  totalCorrections: number;
  avgVolumeDelta: number | string;
  avgInferenceTime: number;
  correctionData: Array<{ name: string; count: number }>;
}

export default function MLDashboardPage() {
  const { user, loading } = useRequireAuth('ADMIN')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return

    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const json = await res.json()
        setData(json)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('An unknown error occurred')
        }
      }
    }
    fetchAnalytics()
  }, [loading, user])

  if (loading || !user) return <div className="p-6 text-sm text-muted">Loading...</div>

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <BrainCircuit className="text-blue" size={28} />
          ML Performance & Analytics
        </h1>
        <p className="text-sm text-muted mt-2">
          Observe inference performance and Human-in-the-Loop (HITL) corrections.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-md bg-warn/10 border border-warn/30 text-sm text-warn">
          {error}
        </div>
      )}

      {data ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Database size={16} />
                <span className="text-[10px] uppercase tracking-wide font-semibold">Total Scans</span>
              </div>
              <div className="text-2xl font-bold font-mono">{data.totalScans}</div>
              <div className="text-xs text-muted mt-1">{data.completedScans} completed</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Activity size={16} />
                <span className="text-[10px] uppercase tracking-wide font-semibold">Avg Inference Time</span>
              </div>
              <div className="text-2xl font-bold font-mono text-green">{data.avgInferenceTime}s</div>
              <div className="text-xs text-muted mt-1">ONNX Runtime (CPU)</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 text-muted mb-2">
                <Settings2 size={16} />
                <span className="text-[10px] uppercase tracking-wide font-semibold">HITL Corrections</span>
              </div>
              <div className="text-2xl font-bold font-mono text-warn">{data.totalCorrections}</div>
              <div className="text-xs text-muted mt-1">Manual overrides</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 text-muted mb-2">
                <ShieldCheck size={16} />
                <span className="text-[10px] uppercase tracking-wide font-semibold">Avg Volume Delta</span>
              </div>
              <div className="text-2xl font-bold font-mono">{data.avgVolumeDelta} cc</div>
              <div className="text-xs text-muted mt-1">Absolute error margin</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
              <ServerCrash size={16} className="text-muted" />
              HITL Corrections Over Time
            </h3>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.correctionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="count" stroke="#5d8bfa" strokeWidth={2} dot={{ r: 4 }} />
                  <CartesianGrid stroke="#1e2330" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050B18', borderColor: '#1e2330', borderRadius: '8px' }}
                    itemStyle={{ color: '#5d8bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-surface/50 rounded-xl" />)}
          </div>
          <div className="h-64 bg-surface/50 rounded-xl" />
        </div>
      )}
    </div>
  )
}
