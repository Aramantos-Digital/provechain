import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// POST /api/proof-tags - Add a tag to a proof
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { proof_id, tag_id } = body

    if (!proof_id || !tag_id) {
      return NextResponse.json(
        { error: 'proof_id and tag_id are required' },
        { status: 400 }
      )
    }

    // Verify the proof exists and check permissions
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .select('id, user_id, team_id')
      .eq('id', proof_id)
      .single()

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    // Check if user has permission to add tags
    // Allow if: user owns the proof OR user is a member of the team
    const isOwner = proof.user_id === user.id
    let isTeamMember = false

    if (proof.team_id) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', proof.team_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      isTeamMember = !!teamMember
    }

    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { error: 'You do not have permission to add tags to this proof' },
        { status: 403 }
      )
    }

    // Get the root_proof_id for this proof (for group-level tagging)
    // Use get_root_by_group_id which is more stable than parent chain traversal
    const { data: rootProofIdResult, error: rootError } = await supabase
      .rpc('get_root_by_group_id', { p_proof_id: proof_id })

    if (rootError || !rootProofIdResult) {
      console.error('Error getting root proof ID:', rootError)
      return NextResponse.json({ error: 'Could not find proof group' }, { status: 500 })
    }

    const root_proof_id = rootProofIdResult

    // Verify the tag belongs to the user and get tag name for audit log
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', tag_id)
      .eq('user_id', user.id)
      .single()

    if (tagError || !tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Add the tag to the proof GROUP (using root_proof_id)
    const { data: proofTag, error } = await supabase
      .from('proof_tags')
      .insert({
        proof_id,
        tag_id,
        root_proof_id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate constraint (tag already added)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This tag is already added to this proof' },
          { status: 409 }
        )
      }
      console.error('Error adding tag to proof:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get proof name for audit log
    const { data: proofData } = await supabase
      .from('proofs')
      .select('proof_name, file_name')
      .eq('id', proof_id)
      .single()

    // Log to audit_logs
    // If this is a team proof, track it as a team action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: proof.team_id ? 'team_proof_tagged' : 'proof_tagged',
      resource_type: 'proof',
      resource_id: proof_id,
      team_id: proof.team_id, // Track team_id for team action filtering
      details: {
        tag_name: tag.name,
        proof_name: proofData?.proof_name || proofData?.file_name,
      }
    })

    return NextResponse.json({ success: true, proof_tag: proofTag })
  } catch (error: any) {
    console.error('Error in POST /api/proof-tags:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/proof-tags - Remove a tag from a proof
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { searchParams } = new URL(request.url)
    const proof_id = searchParams.get('proof_id')
    const tag_id = searchParams.get('tag_id')

    if (!proof_id || !tag_id) {
      return NextResponse.json(
        { error: 'proof_id and tag_id query parameters are required' },
        { status: 400 }
      )
    }

    // Verify the proof exists and check permissions
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .select('id, user_id, team_id')
      .eq('id', proof_id)
      .single()

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    // Check if user has permission to remove tags
    // For personal proofs: owner can remove
    // For team proofs: ONLY admins can remove (not regular members, not even proof creator)
    if (proof.team_id) {
      // This is a team proof - only admins can remove tags
      let isTeamAdmin = false

      // Check if user is admin of the team
      const { data: team } = await supabase
        .from('teams')
        .select('admin_user_id')
        .eq('id', proof.team_id)
        .single()

      if (team && team.admin_user_id === user.id) {
        isTeamAdmin = true
      } else {
        // Also check team_members table for admin role
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', proof.team_id)
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single()

        isTeamAdmin = !!teamMember
      }

      if (!isTeamAdmin) {
        return NextResponse.json(
          { error: 'Only team admins can remove tags from team proofs' },
          { status: 403 }
        )
      }
    } else {
      // This is a personal proof - owner can remove tags
      const isOwner = proof.user_id === user.id

      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only the proof owner can remove tags from personal proofs' },
          { status: 403 }
        )
      }
    }

    // Get the root_proof_id for this proof (for group-level tagging)
    // Use get_root_by_group_id which is more stable than parent chain traversal
    const { data: rootProofIdResult, error: rootError } = await supabase
      .rpc('get_root_by_group_id', { p_proof_id: proof_id })

    if (rootError || !rootProofIdResult) {
      console.error('Error getting root proof ID:', rootError)
      return NextResponse.json({ error: 'Could not find proof group' }, { status: 500 })
    }

    const root_proof_id = rootProofIdResult

    // Get proof and tag info before deleting for audit log
    const { data: proofData } = await supabase
      .from('proofs')
      .select('proof_name, file_name')
      .eq('id', proof_id)
      .single()

    const { data: tagData } = await supabase
      .from('tags')
      .select('name')
      .eq('id', tag_id)
      .single()

    // Remove the tag from the proof GROUP (using root_proof_id)
    const { error } = await supabase
      .from('proof_tags')
      .delete()
      .eq('root_proof_id', root_proof_id)
      .eq('tag_id', tag_id)

    if (error) {
      console.error('Error removing tag from proof:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit_logs
    // If this is a team proof, track it as a team action
    if (proofData && tagData) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: proof.team_id ? 'team_proof_untagged' : 'proof_untagged',
        resource_type: 'proof',
        resource_id: proof_id,
        team_id: proof.team_id, // Track team_id for team action filtering
        details: {
          tag_name: tagData.name,
          proof_name: proofData?.proof_name || proofData?.file_name,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/proof-tags:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
