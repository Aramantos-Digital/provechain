'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      {children}
      <Toaster richColors position="top-center" style={{ fontFamily: 'inherit' }} />
    </ThemeProvider>
  )
}
