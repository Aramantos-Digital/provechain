import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { getTierLimits } from '@/lib/tiers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Get tier from Core API
    const tier = await getUserTier(user.id)
    const limits = getTierLimits(tier)

    // Count all proofs (every proof counts — roots and versions alike)
    const { count: proofCount } = await supabase
      .from('proofs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Count versions specifically (for display purposes)
    const { count: versionCount } = await supabase
      .from('proofs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('parent_proof_id', 'is', null)

    // Calculate total storage (sum of proof_json sizes)
    const { data: proofs } = await supabase
      .from('proofs')
      .select('proof_json')
      .eq('user_id', user.id)

    const totalStorageBytes = proofs?.reduce((sum, p) => {
      return sum + (p.proof_json ? JSON.stringify(p.proof_json).length : 0)
    }, 0) ?? 0

    // Upsert usage stats
    const { error } = await supabase
      .from('usage_stats')
      .upsert({
        user_id: user.id,
        proof_count: proofCount ?? 0,
        proof_version_count: versionCount ?? 0,
        total_storage_bytes: totalStorageBytes,
        max_proofs: limits.maxProofs,
        max_storage_bytes: limits.maxStorageBytes,
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Error upserting usage stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return the calculated data directly (avoids stale reads from separate fetch)
    return NextResponse.json({
      success: true,
      usage: {
        proof_count: proofCount ?? 0,
        proof_version_count: versionCount ?? 0,
        total_storage_bytes: totalStorageBytes,
        max_proofs: limits.maxProofs,
        max_storage_bytes: limits.maxStorageBytes,
        last_calculated_at: new Date().toISOString(),
      }
    })
  } catch (error: any) {
    console.error('Error recalculating usage:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
