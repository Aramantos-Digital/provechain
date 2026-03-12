import { getAuthContext } from '@/lib/auth-context'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/tags - Get all tags for authenticated user
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, tags })
  } catch (error: any) {
    console.error('Error in GET /api/tags:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { name, color } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 })
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: color || '#8B5CF6',
      })
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
      console.error('Error creating tag:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'tag_created',
      resource_type: 'tag',
      resource_id: tag.id,
      details: {
        tag_name: tag.name,
        tag_color: tag.color,
      }
    })

    return NextResponse.json({ success: true, tag })
  } catch (error: any) {
    console.error('Error in POST /api/tags:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
