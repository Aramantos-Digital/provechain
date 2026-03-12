import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
import Providers from '@/components/Providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SessionManager from '@/components/SessionManager'
import EarlyAccessBanner from '@/components/EarlyAccessBanner'
import { PageScrollIndicator } from '@/components/ScrollIndicator'

export const metadata: Metadata = {
  title: 'ProveChain - Cryptographic Proof of Authorship',
  description: 'Create timestamped cryptographic proofs of your files. Free, open source, MIT licensed.',
  icons: {
    icon: '/favicon256.png',
    apple: '/favicon256.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col overflow-x-hidden`}>
        <Providers>
          <SessionManager />
          <img
            src="/provechain_logo.png"
            alt="ProveChain Watermark"
            className="fixed inset-0 m-auto max-w-[80vw] sm:max-w-[60vw] w-full h-auto object-contain opacity-10 pointer-events-none z-0"
          />
          <Header />
          <EarlyAccessBanner />
          <PageScrollIndicator color="#a855f7" />
          <main className="flex-1 flex flex-col justify-center bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20">{children}</main>
          <Footer />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
