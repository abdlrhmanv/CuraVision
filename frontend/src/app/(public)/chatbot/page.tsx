const quickPrompts = [
  'Explain this MRI report in simple terms',
  'What does a brain tumor grade mean?',
  'How should I prepare for my doctor visit?',
  'What questions should I ask my neurologist?',
]

const mockMessages = [
  {
    role: 'assistant',
    text: 'Hi, I am CuraVision Assistant. I can help explain reports and prepare you for your consultation.',
  },
  {
    role: 'user',
    text: 'Can you summarize my report in plain language?',
  },
  {
    role: 'assistant',
    text: 'Your scan suggests an abnormal area that needs specialist review. This does not replace a doctor diagnosis, but it helps you discuss next steps clearly.',
  },
]

export default function ChatbotPage() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-20 py-14 md:py-16">
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/30 text-accent text-[11px] tracking-wide uppercase">
            Demo Experience
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4">
            CuraVision Chatbot
          </h1>
          <p className="text-sm md:text-base text-muted mt-3 max-w-2xl mx-auto">
            A static preview of the assistant interface. You can use this section now
            and wire it to real AI responses later.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-bold mb-2">Report Guidance</h3>
            <p className="text-sm text-muted">
              Explains medical terms in patient-friendly language.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-bold mb-2">Doctor Prep</h3>
            <p className="text-sm text-muted">
              Suggests useful questions before your appointment.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-bold mb-2">Safety First</h3>
            <p className="text-sm text-muted">
              Includes a clear reminder that final decisions are made by doctors.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          <aside className="bg-card border border-border rounded-xl p-4 h-fit">
            <div className="text-xs uppercase tracking-wide text-muted mb-3">
              Quick Prompts
            </div>
            <div className="flex flex-col gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-accent hover:text-accent transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </aside>

          <div className="bg-card border border-border rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div>
                <div className="font-semibold">CuraVision Assistant</div>
                <div className="text-xs text-muted">Static preview mode</div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                Online
              </span>
            </div>

            <div className="space-y-3 min-h-[280px]">
              {mockMessages.map((message, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm ${
                    message.role === 'user'
                      ? 'ml-auto bg-blue/15 border border-blue/30'
                      : 'bg-surface border border-border'
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  disabled
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-border text-sm text-muted"
                />
                <button
                  disabled
                  className="px-4 py-2.5 rounded-lg bg-accent text-[#050B18] font-semibold text-sm opacity-60"
                >
                  Send
                </button>
              </div>
              <p className="text-[11px] text-muted mt-2">
                This is a UI mockup. Connect it to your backend when ready.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
