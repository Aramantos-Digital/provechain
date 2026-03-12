import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

function generateShortCode(): string {
  return randomBytes(6).toString('base64url').substring(0, 8)
}

// POST /api/shares — Create a share link for a proof
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { proof_id, mode } = body

    if (!proof_id || !mode) {
      return NextResponse.json({ error: 'Missing proof_id or mode' }, { status: 400 })
    }
    if (mode !== 'view' && mode !== 'file') {
      return NextResponse.json({ error: 'Invalid mode — must be "view" or "file"' }, { status: 400 })
    }

    // Verify the proof belongs to the user
    const { data: proof, error: proofError } = await supabase
      .from('proofs')
      .select('id, user_id')
      .eq('id', proof_id)
      .single()

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }
    if (proof.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to share this proof' }, { status: 403 })
    }

    // Generate unique short code (retry on collision)
    let shortCode = generateShortCode()
    let retries = 3
    while (retries > 0) {
      const { data: existing } = await supabase
        .from('proof_shares')
        .select('id')
        .eq('short_code', shortCode)
        .maybeSingle()

      if (!existing) break
      shortCode = generateShortCode()
      retries--
    }

    // Create the share
    const { data: share, error: shareError } = await supabase
      .from('proof_shares')
      .insert({
        proof_id,
        user_id: user.id,
        mode,
        short_code: shortCode,
        shared_by_name: user.email,
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error creating share:', shareError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      share,
      share_url: `https://timeanchor.aramantos.dev/verify/${shortCode}`,
    })
  } catch (error: any) {
    console.error('Error in POST /api/shares:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/shares?proof_id=xxx — List shares for a proof
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const proofId = request.nextUrl.searchParams.get('proof_id')

    let query = supabase
      .from('proof_shares')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (proofId) {
      query = query.eq('proof_id', proofId)
    }

    const { data: shares, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
    }

    return NextResponse.json({ success: true, shares: shares || [] })
  } catch (error: any) {
    console.error('Error in GET /api/shares:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/shares?id=xxx — Revoke a share
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const shareId = request.nextUrl.searchParams.get('id')
    if (!shareId) {
      return NextResponse.json({ error: 'Missing share id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('proof_shares')
      .delete()
      .eq('id', shareId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/shares:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
