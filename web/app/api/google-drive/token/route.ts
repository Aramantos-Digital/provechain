import { getAuthContext } from '@/lib/auth-context'
import { getProviderToken } from '@/lib/core'
import { NextResponse } from 'next/server'

// GET /api/google-drive/token — Return the user's Google OAuth token for browser-side API calls
// Used for browser-side export of Google Workspace files (Docs/Sheets/Slides)
// Token is short-lived (1 hour) and scoped to drive.readonly
export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    const token = await getProviderToken(user.id, 'google_drive')

    if (!token) {
      return NextResponse.json({
        error: 'Google Drive not connected. Please connect Google Drive in Connected Services.'
      }, { status: 403 })
    }

    return NextResponse.json({ token })
  } catch (error: any) {
    console.error('Error in GET /api/google-drive/token:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
