'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [{ name: 'Home', href: '/' }, { name: 'Articles', href: '/articles' }, { name: 'Doctors', href: '/doctors' }]

export default function Navbar() {
  const pathname = usePathname()
  return (
    <nav className="px-4 md:px-8 lg:px-20 py-4 border-b border-border bg-bg/95 backdrop-blur-sm z-50">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-0">
        <div className="w-full flex justify-center md:justify-start">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Cura<span className="text-accent">Vision</span>
          </Link>
        </div>
        <div className="flex justify-center gap-6 md:gap-8">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className={`text-sm pb-0.5 border-b-2 transition-all duration-200 ${pathname === item.href ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-white hover:border-accent'}`}>{item.name}</Link>
          ))}
        </div>
        <div className="w-full flex justify-center md:justify-end gap-2.5">
          <Link href="/login" className="px-5 py-2 bg-transparent border border-white/15 rounded-lg text-sm text-white hover:border-accent hover:text-accent transition">Login</Link>
          <Link href="/register" className="px-5 py-2 bg-accent text-[#050B18] rounded-lg text-sm font-bold hover:bg-[#00ddd4] transition">Get Started</Link>
        </div>
      </div>
    </nav>
  )
}
