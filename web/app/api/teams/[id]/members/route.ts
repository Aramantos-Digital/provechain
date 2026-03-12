import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET: List team members with profile info
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const teamId = params.id

    // Verify user has access to this team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, admin_user_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isOwner = team.admin_user_id === user.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this team' },
          { status: 403 }
        )
      }
    }

    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    // Fetch user profile for each member using RPC
    const membersWithProfiles = await Promise.all(
      (members || []).map(async (member) => {
        const { data: userProfile } = await supabase
          .rpc('get_user_profile', { p_user_id: member.user_id })
          .single() as { data: any }

        return {
          ...member,
          user_email: userProfile?.email || null,
          user_name: userProfile?.full_name || null,
          username: userProfile?.username || null,
        }
      })
    )

    return NextResponse.json(membersWithProfiles)
  } catch (error: any) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Add a member to the team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const teamId = params.id
    const body = await request.json()
    const { user_id, role = 'member' } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Verify caller is team admin
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, admin_user_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const isOwner = team.admin_user_id === user.id

    if (!isOwner) {
      const { data: adminMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (!adminMember) {
        return NextResponse.json(
          { error: 'Only team admins can add members' },
          { status: 403 }
        )
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', user_id)
      .single()

    if (existingMember && existingMember.status === 'active') {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 400 }
      )
    }

    // Insert new team member
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding team member:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to add team member' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
