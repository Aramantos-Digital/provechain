import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// PATCH /api/tags/[id] - Update a tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { name, color } = body

    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
      }

      if (name.length > 50) {
        return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 })
      }
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (color !== undefined) updates.color = color

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this tag
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You already have a tag with this name' },
          { status: 409 }
        )
      }
      console.error('Error updating tag:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'tag_updated',
      resource_type: 'tag',
      resource_id: tag.id,
      details: {
        tag_name: tag.name,
        tag_color: tag.color,
        changes: updates,
      }
    })

    return NextResponse.json({ success: true, tag })
  } catch (error: any) {
    console.error('Error in PATCH /api/tags/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    // Get tag info before deleting for audit log
    const { data: tag } = await supabase
      .from('tags')
      .select('name, color')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    // Delete the tag (CASCADE will automatically remove proof_tags entries)
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id) // Ensure user owns this tag

    if (error) {
      console.error('Error deleting tag:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit_logs
    if (tag) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'tag_deleted',
        resource_type: 'tag',
        resource_id: params.id,
        details: {
          tag_name: tag.name,
          tag_color: tag.color,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/tags/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
