import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/automated-sources — List all cloud automations for user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const provider = request.nextUrl.searchParams.get('provider')

    let query = supabase
      .from('automated_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching automated sources:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, automatedSources: data })
  } catch (error: any) {
    console.error('Error in GET /api/automated-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/automated-sources — Create new cloud automation
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { provider, name, selections, schedule } = body

    if (!provider || !name || !selections) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['onedrive', 'dropbox', 'google_drive'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('automated_sources')
      .insert({
        user_id: user.id,
        provider,
        name,
        selections,
        schedule: schedule || 'daily',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automated source:', error)
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'An automation with this name already exists for this provider'
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_source_created',
      resource_type: 'automated_source',
      resource_id: data.id,
      details: { provider, name, schedule },
    })

    return NextResponse.json({ success: true, automatedSource: data })
  } catch (error: any) {
    console.error('Error in POST /api/automated-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/automated-sources — Update automation
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { id, schedule, is_active, selections, name } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    if (schedule !== undefined && !['daily', 'weekly'].includes(schedule)) {
      return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (schedule !== undefined) updates.schedule = schedule
    if (is_active !== undefined) updates.is_active = is_active
    if (selections !== undefined) updates.selections = selections
    if (name !== undefined) updates.name = name

    const { data, error } = await supabase
      .from('automated_sources')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating automated source:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Determine what changed for audit log
    const changes: string[] = []
    if (schedule !== undefined) changes.push(`schedule → ${schedule}`)
    if (is_active === true) changes.push('activated')
    if (is_active === false) changes.push('paused')
    if (selections !== undefined) changes.push('file selections updated')
    if (name !== undefined) changes.push(`name → ${name}`)

    const action = is_active === true ? 'automated_source_activated'
      : is_active === false ? 'automated_source_deactivated'
      : 'automated_source_updated'

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      resource_type: 'automated_source',
      resource_id: id,
      details: { provider: data.provider, name: data.name, updates: changes },
    })

    return NextResponse.json({ success: true, automatedSource: data })
  } catch (error: any) {
    console.error('Error in PATCH /api/automated-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/automated-sources — Delete automation
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const { data: source, error: fetchError } = await supabase
      .from('automated_sources')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('automated_sources')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting automated source:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_source_deleted',
      resource_type: 'automated_source',
      resource_id: id,
      details: { provider: source.provider, name: source.name },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/automated-sources:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
