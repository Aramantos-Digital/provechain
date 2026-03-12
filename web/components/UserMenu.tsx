'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User, LogOut, LayoutDashboard, ChevronDown, Settings, BookOpen, Users, Link2, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserMenuProps {
  mobile?: boolean
  onNavigate?: () => void
}

export default function UserMenu({ mobile = false, onNavigate }: UserMenuProps = {}) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [tier, setTier] = useState<string | null>(null)
  const [hasTeams, setHasTeams] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      if (user) {
        fetchTier()
        checkTeams()
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchTier()
        checkTeams()
      } else {
        setTier(null)
        setHasTeams(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchTier = async () => {
    try {
      const res = await fetch('/api/user/tier')
      if (!res.ok) { setTier('free'); return }
      const data = await res.json()
      setTier(data.tier || 'free')
    } catch {
      setTier('free')
    }
  }

  const checkTeams = async () => {
    try {
      // Check owned and member teams
      const teamsRes = await fetch('/api/teams')
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        if ((teamsData.owned && teamsData.owned.length > 0) || (teamsData.member && teamsData.member.length > 0)) {
          setHasTeams(true)
          return
        }
      }

      // Check pending invitations
      const invRes = await fetch('/api/teams/invitations')
      if (invRes.ok) {
        const invData = await invRes.json()
        if (invData && invData.length > 0) {
          setHasTeams(true)
          return
        }
      }

      setHasTeams(false)
    } catch {
      setHasTeams(false)
    }
  }

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSignOut = async () => {
    await fetch('/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // Show subtle loading indicator while checking auth
  if (loading) {
    return (
      <div className="flex items-center gap-2 opacity-50">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Mobile view - simple buttons
  if (mobile) {
    if (!user) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/login"
            onClick={onNavigate}
            className="text-sm font-semibold px-4 py-3 rounded-lg transition-all text-center bg-secondary text-secondary-foreground hover:bg-accent border border-border"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={onNavigate}
            className="text-sm font-semibold px-4 py-3 rounded-lg transition-all text-center bg-purple-600 hover:bg-purple-700 text-white shadow-md"
          >
            Sign up
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="px-4 py-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm font-medium break-all text-center">{user.email}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tier && tier !== 'free' && (
            <Link
              href="/changelog"
              onClick={onNavigate}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all border border-border"
            >
              <BookOpen size={16} />
              Changelog
            </Link>
          )}
          {hasTeams && (
            <Link
              href="/teams"
              onClick={onNavigate}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all border border-border"
            >
              <Users size={16} />
              Teams
            </Link>
          )}
          {tier && tier !== 'free' && (
            <Link
              href="/products"
              onClick={onNavigate}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all border border-border"
            >
              <Package size={16} />
              Products
            </Link>
          )}
          {tier && tier !== 'free' && (
            <Link
              href="/connected-services"
              onClick={onNavigate}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all border border-border"
            >
              <Link2 size={16} />
              Services
            </Link>
          )}
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-all border border-border"
          >
            <Settings size={16} />
            Settings
          </Link>
        </div>
        <button
          onClick={() => {
            handleSignOut()
            onNavigate?.()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    )
  }

  // Desktop view - dropdown menu
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="text-sm font-medium px-3 py-1.5 rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium px-3 py-1.5 rounded-md transition-all bg-purple-600 hover:bg-purple-700 text-white"
        >
          Sign up
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <User size={18} />
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50"
          >
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Signed in
                </p>
              </div>

              <div className="p-1">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>

                {hasTeams && (
                  <Link
                    href="/teams"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                  >
                    <Users size={16} />
                    Teams
                  </Link>
                )}

                {tier && tier !== 'free' && (
                  <Link
                    href="/changelog"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                  >
                    <BookOpen size={16} />
                    Changelog
                  </Link>
                )}

                {tier && tier !== 'free' && (
                  <Link
                    href="/connected-services"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                  >
                    <Link2 size={16} />
                    Connected Services
                  </Link>
                )}

                {tier && tier !== 'free' && (
                  <Link
                    href="/products"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                  >
                    <Package size={16} />
                    Aramantos Products
                  </Link>
                )}

                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full"
                >
                  <Settings size={16} />
                  Settings
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full text-left text-destructive"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
