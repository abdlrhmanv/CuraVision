const featuredUpdate = {
  tag: 'Platform Update',
  title: 'CuraVision MVP Interface Released',
  summary:
    'Public pages, role-based auth screens, and core information architecture are now live for preview.',
  date: 'Apr 2026',
}

const latestUpdates = [
  {
    type: 'Feature',
    title: 'Static Chatbot Preview Added',
    summary:
      'A complete chatbot UI mock is now available to demonstrate future patient assistant experience.',
    date: 'Apr 20, 2026',
  },
  {
    type: 'UX',
    title: 'Navigation Refined for Public Users',
    summary:
      'Public navbar now emphasizes Home, Articles, and Doctors while keeping auth actions prominent.',
    date: 'Apr 20, 2026',
  },
  {
    type: 'Content',
    title: 'Articles Page Expanded',
    summary:
      'The page now supports a structured updates feed format for product announcements and release notes.',
    date: 'Apr 21, 2026',
  },
  {
    type: 'Roadmap',
    title: 'Doctor & Patient Portals Planned',
    summary:
      'Next milestones include dashboards for scans, report workflows, appointments, and audit visibility.',
    date: 'Planned',
  },
]

const releaseTimeline = [
  'MVP UI foundation complete (public + auth pages)',
  'AI pipeline integration (U-Net + Grad-CAM) in progress',
  'LLM report draft flow planned for next sprint',
  'RAG chatbot and reservation module scheduled after API stabilization',
]

const patientImpact = [
  {
    title: 'Clearer Product Progress',
    desc: 'Patients can easily track what has been launched and what is coming next.',
  },
  {
    title: 'Trust Through Transparency',
    desc: 'Visible release updates improve confidence in platform maturity and safety.',
  },
  {
    title: 'Faster Onboarding',
    desc: 'Update notes explain new features before first use, reducing confusion.',
  },
]

export default function ArticlesPage() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-20 py-14 md:py-16">
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/30 text-accent text-[11px] tracking-wide uppercase">
            Newsroom
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4">
            CuraVision News & Updates
          </h1>
          <p className="text-sm md:text-base text-muted mt-3 max-w-2xl mx-auto">
            Follow the latest platform announcements, release highlights, and
            roadmap progress from the CuraVision team.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8">
          <div className="text-[11px] uppercase tracking-wide text-accent mb-2">
            Featured Update
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            {featuredUpdate.title}
          </h2>
          <p className="text-sm text-muted leading-relaxed mb-4">
            {featuredUpdate.summary}
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded border border-border text-muted">
              {featuredUpdate.tag}
            </span>
            <span className="text-muted">{featuredUpdate.date}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestUpdates.map((item) => (
            <article
              key={item.title}
              className="bg-card border border-border rounded-xl p-5 hover:border-accent transition"
            >
              <div className="text-[11px] uppercase tracking-wide text-accent mb-2">
                {item.type}
              </div>
              <h3 className="font-bold text-base mb-2">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed mb-4">{item.summary}</p>
              <div className="text-xs text-muted">{item.date}</div>
            </article>
          ))}
        </div>

        <div className="mt-10 bg-card border border-border rounded-2xl p-6 md:p-8">
          <div className="text-[11px] uppercase tracking-wide text-accent mb-3">
            Release Timeline
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold mb-5">
            Current progress snapshot
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {releaseTimeline.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-surface/50"
              >
                <span className="text-accent mt-0.5 font-mono">0{index + 1}</span>
                <span className="text-sm text-muted">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-4">
          {patientImpact.map((item) => (
            <div
              key={item.title}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
