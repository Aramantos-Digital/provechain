'use client'

import { useSessionRefresh } from '@/lib/hooks/useSessionRefresh'
import { AlertCircle } from 'lucide-react'

/**
 * Session management component — inactivity-based timeout with countdown.
 * Shows warning banner 5 minutes before forced logout (30 min inactivity).
 */
export default function SessionManager() {
  const { showWarning, remainingSeconds, extendSession } = useSessionRefresh()

  if (!showWarning) return null

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 backdrop-blur-sm shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-900 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-900">
              You will be logged out in <span className="font-bold tabular-nums">{timeDisplay}</span> due to inactivity.
            </p>
          </div>
          <button
            onClick={extendSession}
            className="px-4 py-2 bg-yellow-900 hover:bg-yellow-800 text-yellow-50 rounded-md font-medium text-sm transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
