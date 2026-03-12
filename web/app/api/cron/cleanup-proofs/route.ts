import { NextRequest, NextResponse } from 'next/server'
import { createDataClient } from '@/lib/supabase/server'

// Cleanup may process many expired proofs — needs extended timeout
export const maxDuration = 60

// This route can be called by:
// 1. Vercel Cron (vercel.json config)
// 2. External cron service (cron-job.org, etc.)
// 3. Manual trigger for testing

export async function GET(req: NextRequest) {
  try {
    // Verify authorization (required)
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createDataClient()

    // Find all expired proofs
    const { data: expiredProofs, error: fetchError } = await supabase
      .from('proofs')
      .select('id, proof_name, proof_group_id, parent_proof_id, expires_at')
      .lte('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null)

    if (fetchError) {
      console.error('Error fetching expired proofs:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      )
    }

    if (!expiredProofs || expiredProofs.length === 0) {
      return NextResponse.json({
        success: true,
        deleted_count: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Collect all proof IDs to delete (including entire version chains)
    const idsToDelete = new Set<string>()
    const processedGroups = new Set<string>()

    for (const proof of expiredProofs) {
      idsToDelete.add(proof.id)

      // If proof is part of a version chain, delete entire chain
      const groupId = proof.proof_group_id || (proof.parent_proof_id ? null : proof.id)

      if (proof.proof_group_id && !processedGroups.has(proof.proof_group_id)) {
        processedGroups.add(proof.proof_group_id)

        // Fetch children (proofs whose proof_group_id points to the root)
        const { data: children } = await supabase
          .from('proofs')
          .select('id')
          .eq('proof_group_id', proof.proof_group_id)

        children?.forEach(p => idsToDelete.add(p.id))

        // Also include the root proof itself (proof_group_id IS the root's ID)
        idsToDelete.add(proof.proof_group_id)
      }

      // If this IS a root proof (no parent, no group_id), find its children
      if (!proof.parent_proof_id && !proof.proof_group_id) {
        const rootId = proof.id
        if (!processedGroups.has(rootId)) {
          processedGroups.add(rootId)

          const { data: children } = await supabase
            .from('proofs')
            .select('id')
            .or(`proof_group_id.eq.${rootId},parent_proof_id.eq.${rootId}`)

          children?.forEach(p => idsToDelete.add(p.id))
        }
      }
    }

    // Delete one at a time, children first (avoids trigger conflict)
    // The fix_parent_before_delete trigger UPDATEs siblings during bulk deletes,
    // causing "tuple already modified" errors. Deleting children before parents avoids this.
    const allIds = Array.from(idsToDelete)

    // Separate into children (have parent_proof_id) and roots (don't)
    const { data: proofDetails } = await supabase
      .from('proofs')
      .select('id, parent_proof_id')
      .in('id', allIds)

    const childIds = proofDetails?.filter(p => p.parent_proof_id).map(p => p.id) || []
    const rootIds = proofDetails?.filter(p => !p.parent_proof_id).map(p => p.id) || []

    let deletedCount = 0

    // Delete children first
    if (childIds.length > 0) {
      const { error: childError } = await supabase
        .from('proofs')
        .delete()
        .in('id', childIds)

      if (childError) {
        console.error('Error deleting child proofs:', childError)
      } else {
        deletedCount += childIds.length
      }
    }

    // Then delete roots
    if (rootIds.length > 0) {
      const { error: rootError } = await supabase
        .from('proofs')
        .delete()
        .in('id', rootIds)

      if (rootError) {
        console.error('Error deleting root proofs:', rootError)
      } else {
        deletedCount += rootIds.length
      }
    }

    return NextResponse.json({
      success: true,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in cleanup cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for flexibility
export async function POST(req: NextRequest) {
  return GET(req)
}
