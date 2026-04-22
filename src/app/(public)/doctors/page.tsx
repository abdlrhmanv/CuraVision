const doctors = [
  {
    initials: 'SK',
    initialsColor: 'text-accent bg-accent/10',
    name: 'Dr. Sara Khalil',
    specialty: 'Neurologist',
    location: 'Cairo, Egypt',
    experience: '12 years',
    score: '4.9',
    tags: ['Brain tumor', 'MRI analysis', 'Epilepsy'],
    review: '"Exceptional care, explained my MRI results with clarity."',
    reviewer: '- Ahmed H.',
    rating: '★★★★★',
  },
  {
    initials: 'JW',
    initialsColor: 'text-blue bg-blue/10',
    name: 'Dr. James Wilson',
    specialty: 'Cardiologist',
    location: 'New York, USA',
    experience: '9 years',
    score: '4.8',
    tags: ['Heart disease', 'Echocardiography'],
    review: '"Saved my father\'s life with early detection."',
    reviewer: '- Linda R.',
    rating: '★★★★★',
  },
  {
    initials: 'NF',
    initialsColor: 'text-purple bg-purple/10',
    name: 'Dr. Nadia Farouk',
    specialty: 'Radiologist',
    location: 'Alexandria, Egypt',
    experience: '7 years',
    score: '4.7',
    tags: ['CT scans', 'AI diagnosis'],
    review: '"Her second opinion changed my treatment plan."',
    reviewer: '- Mariam S.',
    rating: '★★★★☆',
  },
  {
    initials: 'AH',
    initialsColor: 'text-warn bg-warn/10',
    name: 'Dr. Ali Hassan',
    specialty: 'Psychiatrist',
    location: 'Cairo, Egypt',
    experience: '10 years',
    score: '4.6',
    tags: ['Anxiety', 'Depression'],
    review: '"Empathetic and genuinely invested in my recovery."',
    reviewer: '- Nour E.',
    rating: '★★★★☆',
  },
]

export default function DoctorsPage() {
  return (
    <div className="min-h-screen px-4 md:px-8 lg:px-20 py-14 md:py-16 bg-[radial-gradient(circle_at_top,rgba(79,142,255,0.06),transparent_45%)]">
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2 text-accent text-[11px] tracking-[3px] uppercase font-semibold">
            <span>Find a specialist</span>
            <span className="w-10 h-px bg-accent/40" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mt-3">
            Browse verified doctors
          </h1>
          <p className="text-sm md:text-base text-muted mt-2.5 max-w-2xl mx-auto">
            Filter by specialty, country, and availability to find the right doctor for you.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 max-w-4xl mx-auto mb-8">
          <input
            placeholder=""
            className="flex-1 h-11 px-4 rounded-lg bg-surface/90 border border-border text-sm placeholder:text-muted/80 focus:outline-none focus:border-accent"
          />
          <select className="h-11 px-4 rounded-lg bg-surface/90 border border-border text-sm text-muted focus:outline-none focus:border-accent">
            <option>All specialties</option>
            <option>Neurologist</option>
            <option>Radiologist</option>
            <option>Psychiatrist</option>
          </select>
          <select className="h-11 px-4 rounded-lg bg-surface/90 border border-border text-sm text-muted focus:outline-none focus:border-accent">
            <option>All countries</option>
            <option>Egypt</option>
            <option>USA</option>
            <option>UK</option>
          </select>
        </div>

        <div className="bg-card/95 border border-border rounded-2xl overflow-hidden">
          {doctors.map((doctor, index) => (
            <div
              key={doctor.name}
              className={`grid grid-cols-1 lg:grid-cols-[1fr_280px_145px] gap-4 lg:gap-5 p-5 md:p-6 ${
                index !== doctors.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border border-border/60 ${doctor.initialsColor}`}>
                  {doctor.initials}
                </div>
                <div>
                  <h3 className="font-bold text-[17px] leading-tight">{doctor.name}</h3>
                  <p className="text-xs text-muted mt-1">
                    {doctor.specialty} · {doctor.location} · {doctor.experience} exp · ★ {doctor.score}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {doctor.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-md bg-surface border border-border text-[10px] uppercase tracking-wide text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-left lg:text-center self-center">
                <div className="text-yellow text-sm tracking-wide">{doctor.rating}</div>
                <p className="text-xs text-muted italic mt-1.5 leading-relaxed">{doctor.review}</p>
                <p className="text-[11px] text-accent mt-1.5">{doctor.reviewer}</p>
              </div>

              <div className="self-center lg:justify-self-end">
                <button className="w-full lg:w-auto px-5 py-2.5 rounded-lg bg-blue text-[#050B18] text-sm font-bold hover:bg-[#6fa0ff] transition shadow-[0_0_0_1px_rgba(79,142,255,0.25)]">
                  View Profile →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
