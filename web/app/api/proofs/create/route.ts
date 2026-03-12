import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { CreateProofSchema } from '@/lib/validations/proof'
import { ZodError } from 'zod'
import { createOTSProof } from '@/lib/opentimestamps'
import { hasExpiry, getExpiryDays, getTierLimits, getHardLimit } from '@/lib/tiers'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Parse and validate request body with Zod
    const body = await request.json()
    const validatedData = CreateProofSchema.parse(body)

    // If creating a version but proof_group_id is missing, calculate it from parent chain
    let finalProofGroupId = validatedData.proof_group_id

    if (validatedData.parent_proof_id && !finalProofGroupId) {
      // Get root proof ID using the database function
      const { data: rootId } = await supabase
        .rpc('get_root_by_group_id', { p_proof_id: validatedData.parent_proof_id })

      if (rootId) {
        // Use root proof's ID as the group ID
        finalProofGroupId = rootId
      }
    }

    // Get user's tier from Core
    const tier = await getUserTier(user.id)
    const subscription = { tier, status: 'active' } as const

    // Check tier limits (every proof counts — roots and versions alike)
    {
      const limits = getTierLimits(tier)

      // Check proof count limit (hard block at maxProofs + 33% grace buffer)
      const hardLimit = getHardLimit(tier)
      if (limits.maxProofs !== null && hardLimit !== null) {
        const { count: proofCount } = await supabase
          .from('proofs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        const count = proofCount ?? 0

        if (count >= hardLimit) {
          // Hard block — exceeded grace buffer
          return NextResponse.json(
            {
              error: `Proof limit reached. Your plan allows ${limits.maxProofs.toLocaleString()} proofs (with grace buffer). Please upgrade to create more.`,
              limit_type: 'proof_count',
              current: count,
              max: limits.maxProofs,
              hard_limit: hardLimit
            },
            { status: 403 }
          )
        }
        // Note: approaching-limit notification emails are handled by cron, not here
      }

      // Check storage limit
      if (limits.maxStorageBytes !== null) {
        const { data: storageProofs } = await supabase
          .from('proofs')
          .select('proof_json')
          .eq('user_id', user.id)

        const currentStorage = storageProofs?.reduce((sum, p) => {
          return sum + (p.proof_json ? JSON.stringify(p.proof_json).length : 0)
        }, 0) ?? 0
        const newSize = validatedData.proof_json ? JSON.stringify(validatedData.proof_json).length : 0

        if ((currentStorage + newSize) > limits.maxStorageBytes) {
          const usedGB = (currentStorage / (1024 * 1024 * 1024)).toFixed(2)
          const maxGB = (limits.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(2)
          return NextResponse.json(
            {
              error: `Storage limit reached. You've used ${usedGB}GB of ${maxGB}GB. Please upgrade for more storage.`,
              limit_type: 'storage',
              current: currentStorage,
              max: limits.maxStorageBytes
            },
            { status: 403 }
          )
        }
      }
    }

    // Calculate expiry date based on tier and team ownership
    let expiresAt: string | null = null
    const teamId = body.team_id as string | null

    // Verify user is a member of the destination team
    if (teamId) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }
    }

    // Team proofs never expire
    if (teamId) {
      expiresAt = null
    } else {
      // Check if user is a member of any team - team members don't get expiry even on personal proofs
      const { data: teamMembership, error: membershipError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (teamMembership) {
        // User is a team member - no expiry on personal proofs
        expiresAt = null
      } else if (validatedData.inherit_expires_at) {
        // Inherit expiry from existing proof (for versions or duplicates)
        expiresAt = validatedData.inherit_expires_at
      } else if (hasExpiry(subscription?.tier)) {
        // Free tier: set expiry based on tier settings
        const expiryDays = getExpiryDays(subscription?.tier)
        if (expiryDays > 0) {
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + expiryDays)
          expiresAt = expiryDate.toISOString()
        }
      }
      // else: paid tiers get null (lifetime storage)
    }

    // Insert proof into database
    const { data, error } = await supabase
      .from('proofs')
      .insert({
        user_id: user.id,
        file_name: validatedData.file_name,
        file_hash: validatedData.file_hash,
        file_size: validatedData.file_size,
        timestamp: validatedData.timestamp,
        proof_json: validatedData.proof_json,
        // Enhanced metadata fields (use file_name as fallback for proof_name)
        proof_name: validatedData.proof_name || validatedData.file_name,
        description_title: validatedData.description_title || null,
        description_body: validatedData.description_body || null,
        official_document_date: validatedData.official_document_date || null,
        version_notes: validatedData.version_notes || null,
        // Version control fields
        parent_proof_id: validatedData.parent_proof_id || null,
        version_number: validatedData.version_number || 1,
        proof_group_id: finalProofGroupId || null,
        // Team fields
        team_id: (body.team_id as string) || null,
        created_for: (body.created_for as string) || 'personal',
        // Set expiry: inherit from existing, 30 days for free tier, or null for paid tier
        expires_at: expiresAt,
        // Hash algorithm version (1 = canonical @aramantos/crypto algorithm)
        hash_version: validatedData.hash_version || null,
        // Legacy description field (for backwards compatibility)
        description: validatedData.description || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save proof', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    // Create OpenTimestamps proof for paid tier users only (async, don't block response)
    if (tier !== 'free') {
      createOTSProofAsync(supabase, data.id, validatedData.file_hash)
        .catch((error) => {
          console.error('Failed to create OTS proof:', error)
          // Don't fail the request - OTS is supplementary
        })
    }

    return NextResponse.json({
      success: true,
      proof: data,
    })
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        },
        { status: 400 }
      )
    }

    console.error('Error creating proof:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Create OpenTimestamps proof asynchronously (doesn't block response)
 * Submits hash to Bitcoin blockchain via OpenTimestamps
 */
async function createOTSProofAsync(
  supabase: any,
  proofId: string,
  fileHash: string
): Promise<void> {
  try {

    // Create OpenTimestamps proof (submits to calendars)
    const otsResult = await createOTSProof(fileHash)

    if (!otsResult.success || !otsResult.otsProof) {
      throw new Error(otsResult.error || 'Failed to create OTS proof')
    }

    // Update proof with OTS data
    const { error } = await supabase
      .from('proofs')
      .update({
        ots_proof: otsResult.otsProof,
        ots_status: 'pending' // Will be 'confirmed' once on blockchain
      })
      .eq('id', proofId)

    if (error) {
      throw new Error(`Failed to save OTS proof: ${error.message}`)
    }

  } catch (error: any) {
    console.error(`OTS creation failed for ${proofId}:`, error.message)
    // Don't throw - let the proof be created without OTS
  }
}
