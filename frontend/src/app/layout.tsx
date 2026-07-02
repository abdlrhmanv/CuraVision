import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/authContext'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { AriaLiveAnnouncer } from '@/components/ui/AriaLiveAnnouncer'

export const metadata: Metadata = {
  title: 'CuraVision',
  description: 'AI-powered brain MRI analysis platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a 
          href="#main-content" 
          className="absolute left-0 top-0 -translate-y-full bg-primary text-white p-2 z-50 focus:translate-y-0 transition-transform"
        >
          Skip to main content
        </a>
        <AriaLiveAnnouncer />
        <OfflineBanner />
        <AuthProvider>
          <div id="main-content" className="w-full h-full flex flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
