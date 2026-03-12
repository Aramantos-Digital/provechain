/**
 * Handles side effects of tier changes (proof expiry).
 *
 * Called from:
 *   - Stripe webhook (after Core upsert/cancel responds with tier_changed)
 *   - Core tier-changed webhook (if Core ever fires it directly)
 */

import { createDataClient } from '@/lib/supabase/server'

const PAID_TIERS = ['founding_member', 'professional', 'team', 'business', 'custom']

/**
 * Apply proof expiry changes when a user's tier changes.
 *
 * - Upgrade (free → paid): clear all expiry timers
 * - Downgrade (paid → free): set grace period (30 days individual, 90 days team/business)
 * - Lateral (paid → different paid): no action
 */
export async function applyTierChange(
  userId: string,
  previousTier: string,
  newTier: string
): Promise<{ action: string; graceDays?: number }> {
  const wasPaid = PAID_TIERS.includes(previousTier)
  const isPaid = PAID_TIERS.includes(newTier)

  const supabase = createDataClient()

  // UPGRADE: free → paid — clear expiry on all user's proofs
  if (!wasPaid && isPaid) {
    await supabase
      .from('proofs')
      .update({ expires_at: null })
      .eq('user_id', userId)
      .not('expires_at', 'is', null)

    console.log(`[tier-effects] Upgrade: ${userId} ${previousTier} → ${newTier} — cleared proof expiry`)
    return { action: 'cleared_expiry' }
  }

  // DOWNGRADE: paid → free — set grace period
  if (wasPaid && !isPaid) {
    const wasTeamOrBusiness = ['team', 'business'].includes(previousTier)
    const graceDays = wasTeamOrBusiness ? 90 : 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + graceDays)

    // Set expiry on personal proofs (no expires_at yet)
    await supabase
      .from('proofs')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('user_id', userId)
      .is('expires_at', null)
      .is('team_id', null)

    // If they were a team owner, set expiry on team proofs too (90 days)
    if (wasTeamOrBusiness) {
      const teamExpiry = new Date()
      teamExpiry.setDate(teamExpiry.getDate() + 90)

      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('admin_user_id', userId)

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id)
        await supabase
          .from('proofs')
          .update({ expires_at: teamExpiry.toISOString() })
          .in('team_id', teamIds)
          .is('expires_at', null)
      }
    }

    console.log(`[tier-effects] Downgrade: ${userId} ${previousTier} → ${newTier} — set ${graceDays}-day grace period`)
    return { action: 'set_grace_period', graceDays }
  }

  // LATERAL MOVE: paid → different paid — no action
  console.log(`[tier-effects] Lateral: ${userId} ${previousTier} → ${newTier} — no expiry changes`)
  return { action: 'none' }
}
