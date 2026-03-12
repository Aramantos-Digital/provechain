import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

// GET: Return user's teams (owned + member)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Get teams where user is admin
    const { data: ownedTeams, error: ownedError } = await supabase
      .from('teams')
      .select('*')
      .eq('admin_user_id', user.id)

    if (ownedError) {
      console.error('Error fetching owned teams:', ownedError)
      return NextResponse.json({ error: 'Failed to fetch owned teams' }, { status: 500 })
    }

    // Get teams where user is a member (via team_members)
    const { data: memberRecords, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (memberError) {
      console.error('Error fetching member teams:', memberError)
      return NextResponse.json({ error: 'Failed to fetch member teams' }, { status: 500 })
    }

    // Fetch full team data for member teams (excluding owned teams to avoid duplicates)
    const ownedTeamIds = new Set((ownedTeams || []).map(t => t.id))
    const memberTeams = []
    for (const record of memberRecords || []) {
      if (ownedTeamIds.has(record.team_id)) continue
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', record.team_id)
        .single()

      if (teamData) {
        memberTeams.push({ ...teamData, user_role: record.role })
      }
    }

    return NextResponse.json({
      owned: ownedTeams || [],
      member: memberTeams,
    })
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new team
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    // Get user's tier from Core API
    const coreTier = await getUserTier(user.id)

    // Only team, business, and custom tiers can create teams
    const canCreateTeam = ['team', 'business', 'custom'].includes(coreTier)
    if (!canCreateTeam) {
      return NextResponse.json(
        { error: 'Team creation requires a Team, Business, or Custom plan' },
        { status: 403 }
      )
    }

    const tier = coreTier as string // business, enterprise, or custom — all valid in DB
    const maxMembers = tier === 'business' ? 25 : 999999 // enterprise/custom get unlimited

    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        admin_user_id: user.id,
        tier,
        max_members: maxMembers,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create team' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
