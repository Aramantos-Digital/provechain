import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Fetch proof from database
    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Proof not found' },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch proof' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching proof:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Parse request body
    const body = await request.json()

    // Build update object with only provided fields
    const updateData: any = {}
    if (body.proof_name !== undefined) updateData.proof_name = body.proof_name
    if (body.description_title !== undefined) updateData.description_title = body.description_title || null
    if (body.description_body !== undefined) updateData.description_body = body.description_body || null
    if (body.official_document_date !== undefined) updateData.official_document_date = body.official_document_date || null

    // Validate proof_name is not empty if provided
    if ('proof_name' in updateData && !updateData.proof_name?.trim()) {
      return NextResponse.json(
        { error: 'Proof name cannot be empty' },
        { status: 400 }
      )
    }

    // Update proof in database
    const { data, error } = await supabase
      .from('proofs')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Proof not found' },
          { status: 404 }
        )
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update proof' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      proof: data,
    })
  } catch (error: any) {
    console.error('Error updating proof:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Fetch proof to check permissions
    const { data: proof, error: fetchError } = await supabase
      .from('proofs')
      .select('id, user_id, team_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !proof) {
      return NextResponse.json(
        { error: 'Proof not found' },
        { status: 404 }
      )
    }

    // Check permissions
    // For personal proofs: owner can delete
    // For team proofs: ONLY admins can delete (not even proof creator)
    if (proof.team_id) {
      // This is a team proof - only admins can delete
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
          { error: 'Only team admins can delete team proofs' },
          { status: 403 }
        )
      }
    } else {
      // This is a personal proof - owner can delete
      const isOwner = proof.user_id === user.id

      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only the proof owner can delete personal proofs' },
          { status: 403 }
        )
      }
    }

    // Delete proof from database
    const { error } = await supabase
      .from('proofs')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete proof' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting proof:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
