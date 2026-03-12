import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const GRACE_MINUTES = 5

// POST /api/automated-repos/grace - Manage grace period for automated repos
// Actions: 'pause' (on disconnect), 'reactivate' (on reconnect), 'cleanup' (delete expired)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { action } = await request.json()

    if (action === 'pause') {
      // Pause all active automated repos and set grace deadline
      const graceDeadline = new Date(Date.now() + GRACE_MINUTES * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('automated_repos')
        .update({
          is_active: false,
          grace_expires_at: graceDeadline,
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .select('id')

      if (error) {
        console.error('Error pausing automated repos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        paused: data?.length || 0,
        grace_expires_at: graceDeadline,
      })
    }

    if (action === 'reactivate') {
      // Reactivate repos that are within the grace period
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('automated_repos')
        .update({
          is_active: true,
          grace_expires_at: null,
        })
        .eq('user_id', user.id)
        .eq('is_active', false)
        .not('grace_expires_at', 'is', null)
        .gt('grace_expires_at', now)
        .select('id')

      if (error) {
        console.error('Error reactivating automated repos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        reactivated: data?.length || 0,
      })
    }

    if (action === 'cleanup') {
      // Delete repos where grace period has expired
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('automated_repos')
        .delete()
        .eq('user_id', user.id)
        .eq('is_active', false)
        .not('grace_expires_at', 'is', null)
        .lt('grace_expires_at', now)
        .select('id')

      if (error) {
        console.error('Error cleaning up expired repos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/automated-repos/grace:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
