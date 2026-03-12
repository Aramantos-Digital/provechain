import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/automated-repos - Get all automated repos for authenticated user
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data: automatedRepos, error } = await supabase
      .from('automated_repos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching automated repos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, automatedRepos })
  } catch (error: any) {
    console.error('Error in GET /api/automated-repos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/automated-repos - Activate automated repo
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Check if user signed in with GitHub
    const githubIdentity = user.identities?.find(identity => identity.provider === 'github')
    if (!githubIdentity) {
      return NextResponse.json({
        error: 'GitHub authentication required'
      }, { status: 403 })
    }

    const body = await request.json()
    const { repo_full_name, repo_url, repo_owner, repo_name, schedule, default_branch } = body

    // Validation
    if (!repo_full_name || !repo_url || !repo_owner || !repo_name) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Check tier limits (will be enforced by database trigger)
    // Trigger will throw error if limit exceeded

    // Create automated repo
    const { data: automatedRepo, error } = await supabase
      .from('automated_repos')
      .insert({
        user_id: user.id,
        repo_full_name,
        repo_url,
        repo_owner,
        repo_name,
        schedule: schedule || 'daily',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating automated repo:', error)

      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'This repository is already configured for automation'
        }, { status: 409 })
      }

      // Handle tier limit errors (from trigger)
      if (error.message && error.message.includes('limit reached')) {
        return NextResponse.json({
          error: error.message
        }, { status: 403 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_repo_activated',
      resource_type: 'automated_repo',
      resource_id: automatedRepo.id,
      details: {
        repo_full_name,
        schedule,
      }
    })

    return NextResponse.json({
      success: true,
      automatedRepo,
      message: `Automated proofs activated for ${repo_full_name}`
    })
  } catch (error: any) {
    console.error('Error in POST /api/automated-repos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/automated-repos - Deactivate automated repo
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // Get automated repo to verify ownership and get details for logging
    const { data: automatedRepo, error: fetchError } = await supabase
      .from('automated_repos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !automatedRepo) {
      return NextResponse.json({
        error: 'Automated repo not found'
      }, { status: 404 })
    }

    // Delete the automated repo
    const { error } = await supabase
      .from('automated_repos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting automated repo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_repo_deactivated',
      resource_type: 'automated_repo',
      resource_id: id,
      details: {
        repo_full_name: automatedRepo.repo_full_name,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Automated proofs deactivated for ${automatedRepo.repo_full_name}`
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/automated-repos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/automated-repos - Update automated repo (schedule, active status)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { id, schedule, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Build update object
    const updates: any = {}
    if (schedule !== undefined) updates.schedule = schedule
    if (is_active !== undefined) updates.is_active = is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: 'No fields to update'
      }, { status: 400 })
    }

    // Update automated repo
    const { data: automatedRepo, error } = await supabase
      .from('automated_repos')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating automated repo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!automatedRepo) {
      return NextResponse.json({
        error: 'Automated repo not found'
      }, { status: 404 })
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'automated_repo_updated',
      resource_type: 'automated_repo',
      resource_id: id,
      details: {
        repo_full_name: automatedRepo.repo_full_name,
        updates,
      }
    })

    return NextResponse.json({
      success: true,
      automatedRepo,
      message: 'Automated repo updated successfully'
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/automated-repos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
