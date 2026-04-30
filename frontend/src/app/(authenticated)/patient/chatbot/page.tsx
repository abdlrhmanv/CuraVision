'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Brain, Menu, ChevronLeft, Plus, MessageSquare } from 'lucide-react'
import { useRequireAuth } from '@/lib/authContext'
import {
  ApiError,
  ChatMessage as ApiChatMessage,
  chatApi,
  reportsApi,
  Report,
} from '@/lib/apiClient'

type UIMessage = {
  id: string
  role: 'user' | 'ai'
  text: string
  sources?: string[]
  timestamp: string
}

function apiToUi(messages: ApiChatMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.sender === 'PATIENT' ? 'user' : 'ai',
    text: m.message,
    timestamp: m.created_at,
  }))
}

export default function PatientChatbot() {
  const { user, loading: authLoading } = useRequireAuth('PATIENT')

  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authLoading || !user) return
    setReportsLoading(true)
    reportsApi
      .listForPatient()
      .then((res) => {
        setReports(res.reports)
        if (res.reports.length > 0 && !activeReportId) {
          setActiveReportId(res.reports[0].id)
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load reports'))
      .finally(() => setReportsLoading(false))
  }, [authLoading, user, activeReportId])

  useEffect(() => {
    if (!activeReportId) {
      setMessages([])
      return
    }
    chatApi
      .history(activeReportId)
      .then((res) => setMessages(apiToUi(res.messages)))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load chat history'))
  }, [activeReportId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const activeReport = useMemo(
    () => reports.find((r) => r.id === activeReportId) ?? null,
    [reports, activeReportId]
  )

  const handleSend = async () => {
    if (!input.trim() || !activeReportId || sending) return

    const userMsg: UIMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await chatApi.send(activeReportId, userMsg.text)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'ai',
          text: res.reply,
          sources: res.sources,
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reach chatbot'
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: `⚠️ ${message}`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  if (authLoading || !user) {
    return <div className="p-6 text-sm text-muted">Loading...</div>
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-card border border-border text-muted hover:text-white hover:border-accent transition"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
          <div>
            <h2 className="text-xl font-bold">AI Medical Assistant</h2>
            <p className="text-xs text-muted">
              {activeReport ? `Grounded in report ${activeReport.id}` : 'Select a report to start'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs text-muted">AI Online</span>
        </div>
      </div>

      <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex min-h-0">
        <div
          className={`border-r border-border bg-card transition-all duration-300 flex flex-col ${
            sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="p-3 border-b border-border">
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-surface border border-border text-muted text-xs flex items-center justify-center gap-2 cursor-not-allowed"
              title="A chat is automatically created per published report"
            >
              <Plus size={14} /> One chat per report
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {reportsLoading ? (
              <div className="p-3 text-xs text-muted">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-3 text-xs text-muted">
                No published reports yet. Your doctor will publish them here.
              </div>
            ) : (
              reports.map((r) => {
                const active = r.id === activeReportId
                return (
                  <div
                    key={r.id}
                    onClick={() => setActiveReportId(r.id)}
                    className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      active
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-surface border border-transparent hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare
                        size={14}
                        className={active ? 'text-accent' : 'text-muted'}
                      />
                      <div
                        className={`text-sm font-medium truncate ${
                          active ? 'text-accent' : 'text-text'
                        }`}
                      >
                        Report · {r.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted pl-6">
                      {new Date(r.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="p-3 border-t border-border text-center">
            <p className="text-[10px] text-muted">{reports.length} published report(s)</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && activeReportId && (
              <div className="text-center text-sm text-muted py-8">
                <Brain size={28} className="mx-auto mb-2 text-accent/60" />
                Ask a question about your report to get started.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-accent text-[#050B18]'
                      : 'bg-card border border-border text-text'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/60">
                      <div className="text-[10px] uppercase tracking-wide text-muted mb-1">
                        Sources
                      </div>
                      <ul className="space-y-0.5">
                        {m.sources.map((s, idx) => (
                          <li key={idx} className="text-[11px] text-muted">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-purple/20 text-purple flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 mt-1">
                    {(user.full_name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Thinking...
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 bg-surface/50">
            {error && (
              <div className="mb-2 px-3 py-2 rounded-md bg-warn/10 border border-warn/30 text-xs text-warn">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={!activeReportId || sending}
                className="flex-1 h-12 px-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition disabled:opacity-50"
                placeholder={
                  activeReportId
                    ? 'Ask about your report...'
                    : 'Select a published report to chat'
                }
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !activeReportId || sending}
                className="px-6 rounded-xl bg-accent text-[#050B18] font-bold text-sm hover:bg-[#00ddd4] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={16} /> Send
              </button>
            </div>

            <p className="text-[10px] text-muted text-center mt-3">
              Always consult a licensed physician for diagnosis and treatment. AI responses are for informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
