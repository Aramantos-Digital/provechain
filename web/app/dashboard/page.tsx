import { createClient, createDataClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProofsList from '@/components/ProofsList'
import { Zap, FileText, Settings } from 'lucide-react'
import { hasChangelog } from '@/lib/tiers'
import { getUserTier } from '@/lib/core'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ new_proof?: string }> }) {
  const { new_proof: newProofId } = await searchParams
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch tier from Core API and pre-fetch proofs in parallel
  const dataClient = createDataClient()
  const [tier, proofsResult] = await Promise.all([
    getUserTier(user.id),
    dataClient
      .from('proofs')
      .select('*')
      .eq('user_id', user.id)
      .is('team_id', null)
      .order('created_at', { ascending: false }),
  ])

  const initialProofs = proofsResult.data || []
  const showUpgradeButton = tier === 'free'
  const showPaidFeatures = hasChangelog(tier)

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-7xl">
      <div className="mb-4">
        {/* Row 1: Title + Account Settings Button */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent text-center md:text-left flex-1">
            Dashboard
          </h1>

          {/* Upgrade Button (Free Tier) */}
          {showUpgradeButton && (
            <Link
              href="/upgrade"
              className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Upgrade for Lifetime Storage</span>
              <span className="sm:hidden">Upgrade</span>
            </Link>
          )}

          {/* Account Settings Button - Desktop */}
          {showPaidFeatures && (
            <Link
              href="/settings"
              className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
            >
              <Settings className="h-4 w-4" />
              <span>Account Settings</span>
            </Link>
          )}
        </div>

        {/* Row 2: Description + Changelog Button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground flex-1">
            View and manage your cryptographic proofs
          </p>

          {/* Buttons Column - Mobile */}
          {showPaidFeatures && (
            <div className="md:hidden flex flex-col gap-2 flex-shrink-0">
              {/* Account Settings Button */}
              <Link
                href="/settings"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              {/* Changelog Button */}
              <Link
                href="/changelog"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                <span>Changelog</span>
              </Link>
            </div>
          )}

          {/* Changelog Button - Desktop */}
          {showPaidFeatures && (
            <Link
              href="/changelog"
              className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
            >
              <FileText className="h-4 w-4" />
              <span>Changelog</span>
            </Link>
          )}
        </div>
      </div>

      <ProofsList userId={user.id} initialProofs={initialProofs} newProofId={newProofId} />
    </div>
  )
}
