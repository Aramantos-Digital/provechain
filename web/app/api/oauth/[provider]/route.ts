import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CORE_API_URL = process.env.CORE_API_URL!

/**
 * GET /api/oauth/[provider]
 * Gets the OAuth connect URL for a provider.
 * Proxies to Core API: GET /oauth/{provider}/connect
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const authClient = createClient()
    const { data: { session } } = await authClient.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Pass redirect_url so Core redirects back to our lightweight callback handler
    const redirectUrl = `${request.nextUrl.origin}/api/oauth/callback`
    const connectUrl = `${CORE_API_URL}/oauth/${params.provider}/connect?redirect_url=${encodeURIComponent(redirectUrl)}`

    const response = await fetch(
      connectUrl,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error(`Error getting ${params.provider} connect URL:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/oauth/[provider]
 * Disconnects a provider.
 * Proxies to Core API: POST /oauth/{provider}/disconnect
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const authClient = createClient()
    const { data: { session } } = await authClient.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    // Route to either disconnect or S3 configure
    if (body.action === 'disconnect') {
      const response = await fetch(
        `${CORE_API_URL}/oauth/${params.provider}/disconnect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return NextResponse.json(error, { status: response.status })
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    // S3 configuration
    if (params.provider === 's3' && body.action === 'configure') {
      const response = await fetch(
        `${CORE_API_URL}/oauth/s3/configure`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_key_id: body.access_key_id,
            secret_access_key: body.secret_access_key,
            region: body.region,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return NextResponse.json(error, { status: response.status })
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error(`Error with ${params.provider} OAuth:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
