'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function EarlyAccessBanner() {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('early-access-banner-dismissed')
    if (!wasDismissed) setDismissed(false)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('early-access-banner-dismissed', 'true')
  }

  if (dismissed) return null

  return (
    <div data-early-access-banner className="sticky top-[65px] z-30 border-b border-purple-500/20 bg-purple-950/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-12 sm:px-4 py-2 text-center text-sm text-purple-200/90">
        <span className="font-medium text-purple-300 animate-pulse-bright">Early Access</span>
        {' '}: ProveChain is in early access. Features may change and we&apos;d love your{' '}
        <a href="mailto:provechain@aramantos.dev" className="underline underline-offset-2 hover:text-white transition-colors">
          feedback
        </a>.
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-purple-500/20 text-purple-300/60 hover:text-purple-200 transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
