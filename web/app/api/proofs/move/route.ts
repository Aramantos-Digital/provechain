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

    // Fetch all proofs to move
    // Note: Don't filter by user_id here because team proofs might be created by other members
    const { data: proofsToMove, error: fetchError } = await supabase
      .from('proofs')
      .select('*')
      .in('id', proof_ids)

    if (fetchError || !proofsToMove || proofsToMove.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch proofs or proofs not found' },
        { status: 500 }
      )
    }

    // Verify user has permission to move these proofs
    for (const proof of proofsToMove) {
      // Personal proofs: must be owned by user
      if (!proof.team_id && proof.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to move these proofs' },
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
            { error: 'You do not have permission to move these proofs' },
            { status: 403 }
          )
        }
      }
    }

    // Permission check: if moving FROM a team, check if user is admin
    const teamProofs = proofsToMove.filter(p => p.team_id !== null)
    if (teamProofs.length > 0) {
      // User is trying to move FROM a team
      const teamId = teamProofs[0].team_id

      // Get user's role in this team
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      // If user is a member (not admin), they can only move TO another team, NOT to personal
      if (membership && membership.role === 'member') {
        if (destination.type === 'personal' ||
            (destination.type === 'team' && destination.teamId !== teamId)) {
          return NextResponse.json(
            { error: 'Team members cannot move proofs out of the team. Only admins can move proofs out.' },
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

    // Get all tags for these proofs
    const { data: proofTags } = await supabase
      .from('proof_tags')
      .select('*, tags(*)')
      .in('proof_id', proof_ids)

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

    // Update all proofs using admin client to bypass RLS
    for (const proof of proofsToMove) {
      const { error: updateError } = await supabase
        .from('proofs')
        .update({
          team_id: newTeamId,
          created_for: newCreatedFor,
        })
        .eq('id', proof.id)

      if (updateError) {
        console.error('Error updating proof:', updateError)
        return NextResponse.json(
          { error: `Failed to update proofs: ${updateError.message}`, details: updateError },
          { status: 500 }
        )
      }

      // Handle tags for this proof
      const proofTagsForProof = (proofTags || []).filter(pt => pt.proof_id === proof.id)

      for (const proofTag of proofTagsForProof) {
        const tagName = proofTag.tags?.name

        if (tagName && destinationTagNames.has(tagName)) {
          // Tag exists in destination - find the destination tag ID and update the proof_tag
          const destinationTag = destinationTags.find(t => t.name === tagName)
          if (destinationTag) {
            // Update proof_tag to point to destination tag (use admin client to bypass RLS)
            await supabase
              .from('proof_tags')
              .update({ tag_id: destinationTag.id })
              .eq('id', proofTag.id)
          }
        } else {
          // Tag doesn't exist in destination - remove the proof_tag association (use admin client)
          await supabase
            .from('proof_tags')
            .delete()
            .eq('id', proofTag.id)
        }
      }
    }

    // Log to audit_logs
    // If moving to/from a team, include team_id for team action filtering
    const sourceTeamId = proofsToMove[0]?.team_id || null
    const destTeamId = destination.type === 'team' ? destination.teamId : null
    const relevantTeamId = destTeamId || sourceTeamId

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: relevantTeamId ? 'team_proof_moved' : 'moved',
      resource_type: 'proof',
      resource_id: proof_ids[0], // Use first proof ID as reference
      team_id: relevantTeamId, // Track which team this action relates to
      details: {
        proof_count: proofsToMove.length,
        destination: destination.type === 'team' ? destination.teamName : 'Personal Storage',
        source: sourceTeamId ? 'team' : 'personal',
        proof_names: proofsToMove.map(p => p.proof_name || p.file_name).slice(0, 5), // Limit to 5 names
      }
    })

    return NextResponse.json({
      success: true,
      message: `Moved ${proofsToMove.length} proof${proofsToMove.length !== 1 ? 's' : ''}`,
      moved_count: proofsToMove.length,
    })
  } catch (error: any) {
    console.error('Error moving proofs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
