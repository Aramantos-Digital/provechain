import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get team by ID (with access check)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', params.id)
      .single()

    if (teamError || !team) {
      if (teamError?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      console.error('Error fetching team:', teamError)
      return NextResponse.json(
        { error: 'Failed to fetch team' },
        { status: 500 }
      )
    }

    // Verify user has access: is admin (owner) or is a team member
    const isOwner = team.admin_user_id === user.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', params.id)
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

    return NextResponse.json(team)
  } catch (error: any) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
