import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const INACTIVITY_LIMIT = 30 * 60 * 1000  // 30 minutes of inactivity before logout
const WARNING_BEFORE = 5 * 60 * 1000     // Show warning 5 minutes before logout

/**
 * Inactivity-based session timeout with warning banner.
 * Tracks user activity (mouse, keyboard, touch, scroll).
 * After 25 minutes idle → warning banner.
 * After 30 minutes idle → sign out.
 */
export function useSessionRefresh() {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const supabaseRef = useRef(createClient())
  const lastActivityRef = useRef(Date.now())
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearAllTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current)
      logoutTimeoutRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const signOut = useCallback(async () => {
    clearAllTimeouts()
    setShowWarning(false)
    try {
      await fetch('/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    toast.error('Session expired due to inactivity. Please sign in again.')
    window.location.href = '/login'
  }, [clearAllTimeouts])

  const resetTimers = useCallback(() => {
    clearAllTimeouts()
    setShowWarning(false)
    lastActivityRef.current = Date.now()

    // Warning at (INACTIVITY_LIMIT - WARNING_BEFORE) ms of inactivity
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true)
      setRemainingSeconds(Math.floor(WARNING_BEFORE / 1000))

      // Start countdown
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current
        const remaining = Math.max(0, Math.ceil((INACTIVITY_LIMIT - elapsed) / 1000))
        setRemainingSeconds(remaining)

        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current)
        }
      }, 1000)
    }, INACTIVITY_LIMIT - WARNING_BEFORE)

    // Actual logout at INACTIVITY_LIMIT ms of inactivity
    logoutTimeoutRef.current = setTimeout(() => {
      signOut()
    }, INACTIVITY_LIMIT)
  }, [clearAllTimeouts, signOut])

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

    const handleActivity = () => {
      const wasWarning = Date.now() - lastActivityRef.current >= (INACTIVITY_LIMIT - WARNING_BEFORE)
      lastActivityRef.current = Date.now()

      // Only reset timers if warning was showing (avoid constant timer churn)
      if (wasWarning) {
        resetTimers()
      }
    }

    // Debounce activity tracking to avoid excessive timer resets
    let activityTimeout: NodeJS.Timeout | null = null
    const debouncedActivity = () => {
      if (activityTimeout) return
      handleActivity()
      activityTimeout = setTimeout(() => {
        activityTimeout = null
      }, 1000) // At most once per second
    }

    events.forEach(event => window.addEventListener(event, debouncedActivity, { passive: true }))

    return () => {
      events.forEach(event => window.removeEventListener(event, debouncedActivity))
      if (activityTimeout) clearTimeout(activityTimeout)
    }
  }, [resetTimers])

  // Initialize timers and listen for auth state
  useEffect(() => {
    const supabase = supabaseRef.current

    // Only start timers if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resetTimers()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resetTimers()
      } else if (event === 'SIGNED_OUT') {
        clearAllTimeouts()
        setShowWarning(false)
      }
    })

    return () => {
      clearAllTimeouts()
      subscription.unsubscribe()
    }
  }, [resetTimers, clearAllTimeouts])

  const extendSession = useCallback(async () => {
    // Refresh the token to ensure it's valid, then reset inactivity
    const supabase = supabaseRef.current
    const { error } = await supabase.auth.refreshSession()
    if (!error) {
      resetTimers()
      toast.success('Session extended')
    } else {
      toast.error('Failed to extend session. Please sign in again.')
      signOut()
    }
  }, [resetTimers, signOut])

  return { showWarning, remainingSeconds, extendSession }
}
