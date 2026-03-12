import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth
    // supabase is service role — used for both queries and admin operations

    const { proof_ids, destination } = await request.json()

    if (!Array.isArray(proof_ids) || proof_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 proof ID is required' },
        { status: 400 }
      )
    }

    if (!destination || !destination.type) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      )
    }

    // Fetch all proofs to copy
    // Note: Don't filter by user_id here because team proofs might be created by other members
    const { data: proofsToCopy, error: fetchError } = await supabase
      .from('proofs')
      .select('*')
      .in('id', proof_ids)

    if (fetchError || !proofsToCopy || proofsToCopy.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch proofs or proofs not found' },
        { status: 500 }
      )
    }

    // Verify user has permission to copy these proofs
    for (const proof of proofsToCopy) {
      // Personal proofs: must be owned by user
      if (!proof.team_id && proof.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to copy these proofs' },
          { status: 403 }
        )
      }

      // Team proofs: user must be a member of the team
      if (proof.team_id) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', proof.team_id)
          .eq('user_id', user.id)
          .single()

        if (!membership) {
          return NextResponse.json(
            { error: 'You do not have permission to copy these proofs' },
            { status: 403 }
          )
        }
      }
    }

    // Verify user is a member of the destination team
    if (destination.type === 'team' && destination.teamId) {
      const { data: destMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', destination.teamId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!destMembership) {
        return NextResponse.json({ error: 'Not a member of the destination team' }, { status: 403 })
      }
    }

    // Determine destination values
    const newTeamId = destination.type === 'team' ? destination.teamId : null
    // created_for is either 'personal' or 'team' (literal strings, not IDs)
    const newCreatedFor = destination.type === 'team' ? 'team' : 'personal'

    // Get destination tags (tags that exist in the destination)
    let destinationTags: any[] = []
    if (destination.type === 'team' && destination.teamId) {
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('team_id', destination.teamId)
      destinationTags = data || []
    } else {
      // Personal storage
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .is('team_id', null)
      destinationTags = data || []
    }

    const destinationTagNames = new Set(destinationTags.map(t => t.name))

    // Group proofs by their proof_group_id to maintain version relationships
    const proofGroups = new Map<string, any[]>()

    for (const proof of proofsToCopy) {
      const groupKey = proof.proof_group_id || proof.id
      if (!proofGroups.has(groupKey)) {
        proofGroups.set(groupKey, [])
      }
      proofGroups.get(groupKey)!.push(proof)
    }

    // Check if user is a team member (for expiry logic)
    const { data: teamMembership } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    // For each group, generate a new proof_group_id
    const copiedProofs: any[] = []
    const oldToNewIdMap = new Map<string, string>()

    for (const [oldGroupId, groupProofs] of Array.from(proofGroups.entries())) {
      // Sort by version_number to maintain order
      groupProofs.sort((a, b) => (a.version_number || 0) - (b.version_number || 0))

      // Generate new proof_group_id for this group
      const newGroupId = crypto.randomUUID()

      for (let i = 0; i < groupProofs.length; i++) {
        const originalProof = groupProofs[i]

        // Calculate expiry for copied proof
        // - Team proofs never expire
        // - Team members don't get expiry on personal proofs
        // - Otherwise inherit from original
        let copiedExpiresAt = originalProof.expires_at
        if (newTeamId || teamMembership) {
          copiedExpiresAt = null
        }

        // Create a copy of the proof with new values
        const proofCopy: any = {
          user_id: user.id,
          team_id: newTeamId,
          created_for: newCreatedFor, // Either 'personal' or team_id
          file_name: originalProof.file_name,
          file_hash: originalProof.file_hash,
          file_size: originalProof.file_size,
          timestamp: originalProof.timestamp,
          proof_name: originalProof.proof_name,
          proof_json: originalProof.proof_json,
          description_title: originalProof.description_title,
          description_body: originalProof.description_body,
          version_number: originalProof.version_number,
          expires_at: copiedExpiresAt,
          proof_group_id: groupProofs.length > 1 ? newGroupId : null, // Only set if multiple versions
          parent_proof_id: null, // Will be set after insertion
        }

        // Insert the copy using admin client to bypass RLS
        const { data: insertedProof, error: insertError } = await supabase
          .from('proofs')
          .insert(proofCopy)
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting proof copy:', insertError)
          return NextResponse.json(
            { error: 'Failed to copy proofs' },
            { status: 500 }
          )
        }

        // Store mapping of old ID to new ID
        oldToNewIdMap.set(originalProof.id, insertedProof.id)
        copiedProofs.push({ original: originalProof, copy: insertedProof })

        // Get tags for this proof
        const { data: proofTags } = await supabase
          .from('proof_tags')
          .select('*, tags(*)')
          .eq('proof_id', originalProof.id)

        // Copy tags that exist in destination
        if (proofTags && proofTags.length > 0) {
          for (const proofTag of proofTags) {
            const tagName = proofTag.tags?.name

            if (tagName && destinationTagNames.has(tagName)) {
              // Find the destination tag
              const destinationTag = destinationTags.find(t => t.name === tagName)
              if (destinationTag) {
                // Create new proof_tag association (use admin client to bypass RLS)
                await supabase
                  .from('proof_tags')
                  .insert({
                    proof_id: insertedProof.id,
                    tag_id: destinationTag.id,
                    root_proof_id: insertedProof.id, // Will be updated later if part of a group
                  })
              }
            }
          }
        }
      }

      // Update parent_proof_id relationships for version-controlled proofs
      if (groupProofs.length > 1) {
        for (let i = 1; i < groupProofs.length; i++) {
          const originalProof = groupProofs[i]
          const newProofId = oldToNewIdMap.get(originalProof.id)
          const previousProof = groupProofs[i - 1]
          const newParentId = oldToNewIdMap.get(previousProof.id)

          if (newProofId && newParentId) {
            await supabase
              .from('proofs')
              .update({ parent_proof_id: newParentId })
              .eq('id', newProofId)
          }
        }

        // Update root_proof_id for all proof_tags in this group
        const firstNewProofId = oldToNewIdMap.get(groupProofs[0].id)
        if (firstNewProofId) {
          for (const originalProof of groupProofs) {
            const newProofId = oldToNewIdMap.get(originalProof.id)
            if (newProofId) {
              await supabase
                .from('proof_tags')
                .update({ root_proof_id: firstNewProofId })
                .eq('proof_id', newProofId)
            }
          }
        }
      }
    }

    // Log to audit_logs
    // If copying to/from a team, include team_id for team action filtering
    const sourceTeamId = proofsToCopy[0]?.team_id || null
    const destTeamId = destination.type === 'team' ? destination.teamId : null
    const relevantTeamId = destTeamId || sourceTeamId

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: relevantTeamId ? 'team_proof_copied' : 'copied',
      resource_type: 'proof',
      resource_id: proof_ids[0], // Use first proof ID as reference
      team_id: relevantTeamId, // Track which team this action relates to
      details: {
        proof_count: proofsToCopy.length,
        destination: destination.type === 'team' ? destination.teamName : 'Personal Storage',
        source: sourceTeamId ? 'team' : 'personal',
        proof_names: proofsToCopy.map(p => p.proof_name || p.file_name).slice(0, 5), // Limit to 5 names
      }
    })

    return NextResponse.json({
      success: true,
      message: `Copied ${proofsToCopy.length} proof${proofsToCopy.length !== 1 ? 's' : ''}`,
      copied_count: proofsToCopy.length,
    })
  } catch (error: any) {
    console.error('Error copying proofs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
