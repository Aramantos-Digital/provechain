import { getAuthContext } from '@/lib/auth-context'
import { getProviderToken } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/onedrive/files?folderId=root — List files in a OneDrive folder
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    const rawFolderId = request.nextUrl.searchParams.get('folderId') || 'root'

    // Sanitize folderId — OneDrive item IDs are alphanumeric with hyphens/exclamation marks
    const folderId = rawFolderId === 'root' ? 'root' : rawFolderId.replace(/[^a-zA-Z0-9!_-]/g, '')
    if (!folderId) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    // Get OneDrive token from Core
    const providerToken = await getProviderToken(user.id, 'onedrive')

    if (!providerToken) {
      return NextResponse.json({
        error: 'OneDrive not connected. Please connect OneDrive in Connected Services.'
      }, { status: 403 })
    }

    // Call Microsoft Graph API
    const endpoint = folderId === 'root'
      ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
      : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`

    const response = await fetch(
      `${endpoint}?$select=id,name,size,lastModifiedDateTime,folder,file,webUrl&$top=100&$orderby=name`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      console.error('OneDrive API error:', error)
      return NextResponse.json({
        error: `OneDrive API error: ${error.error?.message || response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()

    const items = (data.value || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      size: item.size || 0,
      lastModified: item.lastModifiedDateTime,
      isFolder: !!item.folder,
      childCount: item.folder?.childCount || 0,
      mimeType: item.file?.mimeType || null,
      webUrl: item.webUrl,
    }))

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error in GET /api/onedrive/files:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
