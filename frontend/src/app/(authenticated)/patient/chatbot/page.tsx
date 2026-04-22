'use client'

import { useState } from 'react'
import { Send, Paperclip, FolderOpen, Brain, X, Menu, ChevronLeft, Plus, MessageSquare, Trash2 } from 'lucide-react'

export default function PatientChatbot() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello Omar — I\'m your AI medical assistant. Describe your symptoms and I will help you.', timestamp: new Date() },
    { role: 'user', text: 'I have recurring headaches with light sensitivity.', timestamp: new Date() },
    { role: 'ai', text: 'Thanks for sharing. For persistent symptoms, please consult your neurologist for full evaluation. Would you like me to help you schedule an appointment?', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [attachedScan, setAttachedScan] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeChatId, setActiveChatId] = useState(1)

  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'Headache follow-up', preview: 'I have recurring headaches...', date: 'Today', active: true },
    { id: 2, title: 'MRI interpretation', preview: 'Can you explain my MRI...', date: 'Yesterday', active: false },
    { id: 3, title: 'Treatment plan', preview: 'What are my treatment...', date: 'Apr 18, 2026', active: false },
    { id: 4, title: 'Medication questions', preview: 'Side effects of Topiramate...', date: 'Apr 15, 2026', active: false },
    { id: 5, title: 'Follow-up appointment', preview: 'When should I schedule...', date: 'Apr 10, 2026', active: false },
  ])

  const handleSend = () => {
    if (!input.trim() && !attachedScan) return
    
    const newMessage = { role: 'user', text: input || 'I attached a scan for review.', timestamp: new Date() }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    
    setTimeout(() => {
      const aiResponse = { 
        role: 'ai', 
        text: attachedScan 
          ? `I've received your scan${input ? ` and your message: "${input}"` : ''}. Our AI model is analyzing it. A doctor will review it shortly.` 
          : 'Thank you for your message. Our AI is processing your request. A doctor may review this if needed.',
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, aiResponse])
      setAttachedScan(null)
    }, 1000)
  }

  const handleNewChat = () => {
    const newId = Math.max(...chatHistory.map(c => c.id), 0) + 1
    const newChat = {
      id: newId,
      title: 'New conversation',
      preview: 'Start a new conversation...',
      date: 'Just now',
      active: true
    }
    setChatHistory(prev => prev.map(c => ({ ...c, active: false })))
    setChatHistory(prev => [newChat, ...prev])
    setActiveChatId(newId)
    setMessages([{ role: 'ai', text: 'Hello Omar — I\'m your AI medical assistant. How can I help you today?', timestamp: new Date() }])
    setInput('')
    setAttachedScan(null)
  }

  const handleSelectChat = (chatId: number) => {
    setChatHistory(prev => prev.map(c => ({ ...c, active: c.id === chatId })))
    setActiveChatId(chatId)
    // In a real app, you would load the chat messages here
  }

  const handleDeleteChat = (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setChatHistory(prev => prev.filter(c => c.id !== chatId))
    if (activeChatId === chatId && chatHistory.length > 1) {
      const nextChat = chatHistory.find(c => c.id !== chatId)
      if (nextChat) handleSelectChat(nextChat.id)
    }
  }

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Chat Header */}
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
            <p className="text-xs text-muted">Powered by RAG · Medical literature grounded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-xs text-muted">AI Online</span>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex min-h-0">
        {/* Chat History Sidebar - Collapsible */}
        <div className={`border-r border-border bg-card transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
          {/* New Chat Button - At the TOP like DeepSeek */}
          <div className="p-3 border-b border-border">
            <button
              onClick={handleNewChat}
              className="w-full py-2.5 rounded-xl bg-accent text-[#050B18] text-sm font-semibold hover:bg-[#00ddd4] transition flex items-center justify-center gap-2"
            >
              <Plus size={16} /> New Chat
            </button>
          </div>
          
          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  chat.active
                    ? 'bg-accent/10 border border-accent/30'
                    : 'hover:bg-surface border border-transparent hover:border-border'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare size={14} className={`flex-shrink-0 ${chat.active ? 'text-accent' : 'text-muted'}`} />
                    <div className={`text-sm font-medium truncate ${chat.active ? 'text-accent' : 'text-text'}`}>
                      {chat.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted">{chat.date}</span>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-warn/10 transition-all duration-200"
                    >
                      <Trash2 size={12} className="text-muted hover:text-warn" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-muted line-clamp-1 pl-6">{chat.preview}</div>
              </div>
            ))}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border text-center">
            <p className="text-[10px] text-muted">{chatHistory.length} conversations</p>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">
                    AI
                  </div>
                )}
                <div className={`max-w-[70%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-accent text-[#050B18]' 
                    : 'bg-card border border-border text-text'
                }`}>
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-purple/20 text-purple flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 mt-1">
                    You
                  </div>
                )}
              </div>
            ))}
            
            {attachedScan && (
              <div className="flex justify-end">
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-2 px-3 text-xs flex items-center gap-2">
                  <Brain size={14} className="text-accent" /> 
                  <span>Attached: {attachedScan.name}</span>
                  <button onClick={() => setAttachedScan(null)} className="text-warn hover:text-warn/80 ml-2">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-surface/50">
            <div className="flex gap-2 mb-3">
              <button className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted hover:border-accent hover:text-accent transition flex items-center gap-1.5">
                <Paperclip size={12} /> Attach Scan
              </button>
              <button className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted hover:border-accent hover:text-accent transition flex items-center gap-1.5">
                <FolderOpen size={12} /> From My Scans
              </button>
            </div>
            
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 h-12 px-4 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
                placeholder="Describe your symptoms or ask a question..."
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() && !attachedScan}
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