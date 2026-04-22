import Navbar from './Navbar'
import Footer from './Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (<><Navbar /><main className="min-h-screen">{children}</main><Footer /></>)
}
