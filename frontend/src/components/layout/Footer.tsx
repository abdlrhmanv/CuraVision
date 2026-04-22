export default function Footer() {
  return (
    <footer className="border-t border-border py-8 px-4 md:px-8 lg:px-20 bg-surface/20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-sm font-extrabold text-center md:text-left">
          Cura<span className="text-accent">Vision</span>
        </div>
        <div className="flex justify-center gap-6 text-xs text-muted">
          <a href="#" className="hover:text-white transition">Privacy Policy</a>
          <a href="#" className="hover:text-white transition">Terms of Service</a>
          <a href="#" className="hover:text-white transition">Contact</a>
        </div>
        <div className="text-xs text-muted text-center md:text-right">© 2026 CuraVision. AI-Powered Brain MRI Analysis.</div>
      </div>
    </footer>
  )
}
