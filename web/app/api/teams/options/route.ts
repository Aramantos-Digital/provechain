import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET: Return user's team options via RPC
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data, error } = await supabase
      .rpc('get_user_team_options', { p_user_id: user.id })

    if (error) {
      console.error('Error fetching team options:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch team options' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error fetching team options:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
