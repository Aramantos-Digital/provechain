import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

const GRACE_MINUTES = 5

// POST /api/automated-sources/grace — Manage grace period for cloud automations
// Actions: 'pause' (on disconnect), 'reactivate' (on reconnect), 'cleanup' (delete expired)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { action, provider } = await request.json()

    if (!['pause', 'reactivate', 'cleanup'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (provider && !['onedrive', 'dropbox', 'google_drive'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    if (action === 'pause') {
      const graceDeadline = new Date(Date.now() + GRACE_MINUTES * 60 * 1000).toISOString()

      let query = supabase
        .from('automated_sources')
        .update({
          is_active: false,
          grace_expires_at: graceDeadline,
        })
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (provider) query = query.eq('provider', provider)

      const { data, error } = await query.select('id')

      if (error) {
        console.error('Error pausing automated sources:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        paused: data?.length || 0,
        grace_expires_at: graceDeadline,
      })
    }

    if (action === 'reactivate') {
      const now = new Date().toISOString()

      let query = supabase
        .from('automated_sources')
        .update({
          is_active: true,
          grace_expires_at: null,
        })
        .eq('user_id', user.id)
        .eq('is_active', false)
        .not('grace_expires_at', 'is', null)
        .gt('grace_expires_at', now)

      if (provider) query = query.eq('provider', provider)

      const { data, error } = await query.select('id')

      if (error) {
        console.error('Error reactivating automated sources:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        reactivated: data?.length || 0,
      })
    }

    if (action === 'cleanup') {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('automated_sources')
        .delete()
        .eq('user_id', user.id)
        .eq('is_active', false)
        .not('grace_expires_at', 'is', null)
        .lt('grace_expires_at', now)
        .select('id')

      if (error) {
        console.error('Error cleaning up expired sources:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/automated-sources/grace:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
