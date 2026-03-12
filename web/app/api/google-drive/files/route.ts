import { getAuthContext } from '@/lib/auth-context'
import { getProviderToken } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/google-drive/files?folderId=root — List files in a Google Drive folder
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    const rawFolderId = request.nextUrl.searchParams.get('folderId') || 'root'

    // Sanitize folderId — Google Drive IDs are alphanumeric with hyphens/underscores
    const folderId = rawFolderId === 'root' ? 'root' : rawFolderId.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!folderId) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    // Get Google Drive token from Core
    const providerToken = await getProviderToken(user.id, 'google_drive')

    if (!providerToken) {
      return NextResponse.json({
        error: 'Google Drive not connected. Please connect Google Drive in Connected Services.'
      }, { status: 403 })
    }

    // Call Google Drive API — folderId is sanitized above to prevent query injection
    const query = `'${folderId}' in parents and trashed = false`

    const params = new URLSearchParams({
      q: query,
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
      orderBy: 'folder,name',
      pageSize: '100',
    })

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      console.error('Google Drive API error:', error)
      return NextResponse.json({
        error: `Google Drive API error: ${error.error?.message || response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()

    const items = (data.files || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      size: parseInt(item.size || '0', 10),
      lastModified: item.modifiedTime,
      isFolder: item.mimeType === 'application/vnd.google-apps.folder',
      mimeType: item.mimeType,
      webUrl: item.webViewLink,
    }))

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error in GET /api/google-drive/files:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
