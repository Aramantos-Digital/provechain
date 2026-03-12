import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// GET: List pending invitations for a team
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const teamId = request.nextUrl.searchParams.get('teamId')
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    // Verify user is a member of this team before listing invitations
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
    }

    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error: any) {
    console.error('Error in GET /api/teams/invite:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { teamId, email, role } = await request.json()

    if (!teamId || !email) {
      return NextResponse.json({ error: 'teamId and email are required' }, { status: 400 })
    }

    // Verify user is team admin
    const { data: team } = await supabase
      .from('teams')
      .select('admin_user_id')
      .eq('id', teamId)
      .single()

    if (!team || team.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Only team admins can invite members' }, { status: 403 })
    }

    // Check for existing pending invitation
    const { data: existing } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Invitation already pending for this email' }, { status: 409 })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role: role || 'member',
        token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ invitation })
  } catch (error: any) {
    console.error('Error in POST /api/teams/invite:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Cancel an invitation
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const invitationId = request.nextUrl.searchParams.get('invitationId')
    if (!invitationId) {
      return NextResponse.json({ error: 'invitationId is required' }, { status: 400 })
    }

    // Get invitation and verify ownership
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('team_id')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify user is team admin
    const { data: team } = await supabase
      .from('teams')
      .select('admin_user_id')
      .eq('id', invitation.team_id)
      .single()

    if (!team || team.admin_user_id !== user.id) {
      return NextResponse.json({ error: 'Only team admins can cancel invitations' }, { status: 403 })
    }

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      console.error('Error deleting invitation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/teams/invite:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
