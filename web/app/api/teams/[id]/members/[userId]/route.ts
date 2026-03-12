import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// Helper: verify caller is team admin (owner or admin role member)
async function verifyTeamAdmin(
  supabase: any,
  teamId: string,
  callerId: string
): Promise<{ isAdmin: boolean; team: any; error?: string }> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, admin_user_id, name')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    return { isAdmin: false, team: null, error: 'Team not found' }
  }

  if (team.admin_user_id === callerId) {
    return { isAdmin: true, team }
  }

  const { data: adminMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', callerId)
    .eq('role', 'admin')
    .single()

  if (adminMember) {
    return { isAdmin: true, team }
  }

  return { isAdmin: false, team, error: 'Only team admins can perform this action' }
}

// DELETE: Remove a team member (set status to 'removed')
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const teamId = params.id
    const targetUserId = params.userId

    // Verify caller is team admin
    const { isAdmin, team, error: adminError } = await verifyTeamAdmin(supabase, teamId, user.id)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || 'Only team admins can remove members' },
        { status: 403 }
      )
    }

    // Prevent removing the team owner
    if (targetUserId === team.admin_user_id) {
      return NextResponse.json(
        { error: 'Cannot remove the team owner' },
        { status: 400 }
      )
    }

    // Update member status to 'removed'
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'removed' })
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update a team member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const teamId = params.id
    const targetUserId = params.userId

    const body = await request.json()
    const { role } = body

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      )
    }

    // Verify caller is team admin
    const { isAdmin, team, error: adminError } = await verifyTeamAdmin(supabase, teamId, user.id)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || 'Only team admins can change member roles' },
        { status: 403 }
      )
    }

    // Prevent changing the team owner's role
    if (targetUserId === team.admin_user_id) {
      return NextResponse.json(
        { error: 'Cannot change the team owner\'s role' },
        { status: 400 }
      )
    }

    // Update the member's role
    const { data, error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)
      .select()
      .single()

    if (error) {
      console.error('Error updating member role:', error)
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, member: data })
  } catch (error: any) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
