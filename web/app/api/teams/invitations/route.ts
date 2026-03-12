import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get invitations — by token (single) or by user email (list pending)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (token) {
      // Look up single invitation by token
      const { data: invitation, error } = await supabase
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
        .eq('token', token)
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

      return NextResponse.json(invitation)
    }

    // No token — list pending invitations for current user by email
    const userEmail = user.email?.toLowerCase()

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not available' },
        { status: 400 }
      )
    }

    const { data: invitations, error } = await supabase
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
      .eq('email', userEmail)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    return NextResponse.json(invitations || [])
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
