'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProveChainBrowserClient } from '@/lib/supabase/provechain-browser'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasProofs, setHasProofs] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)

      if (user) {
        try {
          const dataClient = createProveChainBrowserClient()
          const { count } = await dataClient
            .from('proofs')
            .select('id', { count: 'exact', head: true })
            .is('team_id', null)
          setHasProofs((count || 0) > 0)
        } catch {
          // Ignore — default hasProofs is false
        }
      }

      setIsLoading(false)
    }
    checkAuth()
  }, [supabase])

  const getButtonText = () => {
    if (isLoading) {
      return 'Create Proof →' // Default text while loading
    }
    if (!isAuthenticated || !hasProofs) {
      return 'Create Your First Proof →'
    }
    return 'Create Proof →'
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Prove You Created It First
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ever needed to prove when you created something? ProveChain creates tamper-proof
            timestamps of your files. Perfect for protecting your work, proving delivery dates,
            or defending your ideas.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              {getButtonText()}
            </Link>
            <Link
              href="/use-cases"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 border border-white/10 text-base sm:text-lg font-semibold rounded-lg text-foreground frost-light hover:frost-warm transition-all"
            >
              Use Cases
            </Link>
            <Link
              href="/cli"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 border border-white/10 text-base sm:text-lg font-semibold rounded-lg text-foreground frost-light hover:frost-warm transition-all"
            >
              CLI Docs
            </Link>
          </div>

          {/* Privacy Badge */}
          <div className="inline-block px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="text-sm font-medium text-green-400 text-center">
              <svg className="w-4 h-4 text-green-500 inline-block align-middle mb-[3px] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              100% Private
              <svg className="w-4 h-4 text-green-500 inline-block align-middle mb-[3px] ml-2 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <br className="sm:hidden" />
              <span className="hidden sm:inline">. </span>Your files never leave your device
            </span>
          </div>
        </div>

        {/* Plain English Explainer */}
        <div className="max-w-3xl mx-auto mb-12 p-6 glass-card rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">What is ProveChain?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4 text-center">
            Think of it like a notary stamp, but for your files. When you create a proof,
            ProveChain generates a unique fingerprint of your work with a timestamp. This proves
            you had those exact files at that exact moment, and no one can fake it.
          </p>
          <div className="mt-6">
            <p className="font-semibold mb-3">Perfect for:</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-muted-foreground">Freelancers proving work delivery</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-muted-foreground">Inventors protecting their ideas</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-muted-foreground">Contractors showing completion dates</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-muted-foreground">Anyone who needs "I created this first"</span>
              </div>
            </div>
          </div>
        </div>

        {/* Who Can Benefit Section */}
        <div className="max-w-5xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Who Can Benefit from ProveChain?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* LEFT: Content Creators */}
            <div className="glass-card rounded-lg p-6 hover:shadow-md transition-shadow text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Content Creators</h3>
              <p className="text-sm text-muted-foreground mb-3">
                "Protect my creative work before sharing"
              </p>
              <p className="text-xs text-muted-foreground">
                YouTubers, photographers, designers, and artists timestamp their work to prove originality
              </p>
            </div>

            {/* MIDDLE: Anyone */}
            <div className="glass-card rounded-lg p-6 ring-2 ring-primary/20 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Anyone</h3>
              <p className="text-sm text-muted-foreground mb-3">
                "Peace of mind for anything I create"
              </p>
              <p className="text-xs text-muted-foreground">
                You never know when you'll need proof. Timestamp anything, just in case
              </p>
            </div>

            {/* RIGHT: Authors & Researchers */}
            <div className="glass-card rounded-lg p-6 hover:shadow-md transition-shadow text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Authors & Researchers</h3>
              <p className="text-sm text-muted-foreground mb-3">
                "Prove when I wrote it, before I share it"
              </p>
              <p className="text-xs text-muted-foreground">
                Writers, lawyers, musicians, researchers. Anyone creating documentation or original work
              </p>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link
              href="/use-cases"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              See All Use Cases →
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="font-semibold mb-2">Free Forever</h3>
              <p className="text-sm text-muted-foreground">
                Create unlimited proofs.<br />
                No signup required.<br />
                MIT licensed.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">100% Private</h3>
              <p className="text-sm text-muted-foreground">
                All hashing happens locally.<br />
                Your files never leave your device.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">SHA-256 Secure</h3>
              <p className="text-sm text-muted-foreground">
                Industry-standard cryptographic hashing.<br />
                Same as used by Git.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
