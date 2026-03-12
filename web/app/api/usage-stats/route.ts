import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { data, error } = await supabase
      .from('usage_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // PGRST116 = no rows found — not an error, just no usage stats yet
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          proof_count: 0,
          proof_version_count: 0,
          total_storage_bytes: 0,
          max_proofs: null,
          max_storage_bytes: null,
          last_calculated_at: new Date().toISOString(),
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching usage stats:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
