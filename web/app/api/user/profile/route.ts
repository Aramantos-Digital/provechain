import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id query parameter is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .rpc('get_user_profile', { p_user_id: userId })
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Only return full profile for the authenticated user's own profile.
    // For other users, return only public-safe fields (name and avatar).
    if (userId !== user.id) {
      const profile = data as { id: string; full_name: string; avatar_url: string }
      return NextResponse.json({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
