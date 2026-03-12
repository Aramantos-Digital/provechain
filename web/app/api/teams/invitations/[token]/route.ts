import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get invitation details by token, including team info
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        expires_at,
        accepted_at,
        created_at,
        teams (
          id,
          name,
          admin_user_id
        )
      `)
      .eq('token', params.token)
      .single()

    if (error || !invitation) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
      }
      console.error('Error fetching invitation:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitation' },
        { status: 500 }
      )
    }

    // Optionally get the inviter's profile for display
    const teamData = Array.isArray(invitation.teams)
      ? invitation.teams[0]
      : invitation.teams

    let inviterProfile = null
    if (teamData?.admin_user_id) {
      const { data: profile } = await supabase
        .rpc('get_user_profile', { p_user_id: teamData.admin_user_id })
        .single()

      inviterProfile = profile || null
    }

    return NextResponse.json({
      ...invitation,
      inviter_profile: inviterProfile,
    })
  } catch (error: any) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update invitation status (accept invitation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Fetch the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        expires_at,
        accepted_at,
        teams (
          id,
          name,
          admin_user_id
        )
      `)
      .eq('token', params.token)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Validate invitation state
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Verify email matches current user
    const userEmail = user.email?.toLowerCase()
    const invitedEmail = invitation.email.toLowerCase()

    if (userEmail !== invitedEmail) {
      return NextResponse.json(
        { error: `This invitation was sent to ${invitation.email}. Please log in with that account.` },
        { status: 403 }
      )
    }

    if (status === 'accepted') {
      const teamData = Array.isArray(invitation.teams)
        ? invitation.teams[0]
        : invitation.teams
      const adminUserId = teamData?.admin_user_id

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .single()

      if (existingMember && existingMember.status === 'active') {
        return NextResponse.json(
          { error: 'You are already a member of this team' },
          { status: 400 }
        )
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: 'member',
          invited_by: adminUserId,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          status: 'active',
        })

      if (memberError) {
        console.error('Failed to add team member:', memberError)
        return NextResponse.json(
          { error: 'Failed to accept invitation' },
          { status: 500 }
        )
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Failed to update invitation:', updateError)
        // Don't fail — user is already added to team
      }

      // Mark related notification as read if exists
      const { data: notification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'team_invitation')
        .eq('metadata->>invitation_id', invitation.id)
        .single()

      if (notification) {
        await supabase.rpc('mark_notification_read', {
          p_notification_id: notification.id,
        })
      }

      return NextResponse.json({
        success: true,
        team_id: invitation.team_id,
      })
    }

    // For other status updates (e.g., 'declined')
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({ accepted_at: status === 'declined' ? new Date().toISOString() : null })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Failed to update invitation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
