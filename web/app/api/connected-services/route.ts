import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CORE_API_URL = process.env.CORE_API_URL!

/**
 * GET /api/connected-services
 * Lists all connected OAuth services for the current user.
 * Proxies to Core API: GET /me/connected-services
 */
export async function GET() {
  try {
    const authClient = createClient()
    const { data: { session } } = await authClient.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await fetch(`${CORE_API_URL}/me/connected-services`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch connected services' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching connected services:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
