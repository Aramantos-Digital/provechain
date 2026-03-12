import { getAuthContext } from '@/lib/auth-context'
import { getProviderToken } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/dropbox/files — List files in a Dropbox folder
// Using POST because Dropbox API requires POST for list_folder
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    const body = await request.json()
    const rawPath = body.path || ''

    // Sanitize path — Dropbox paths must be empty (root) or start with /
    // Strip any characters that could be used for injection
    const folderPath = rawPath === '' ? '' : rawPath.replace(/[^\w\s/._-]/g, '')
    if (rawPath && !rawPath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 })
    }

    // Get Dropbox token from Core
    const providerToken = await getProviderToken(user.id, 'dropbox')

    if (!providerToken) {
      return NextResponse.json({
        error: 'Dropbox not connected. Please connect Dropbox in Connected Services.'
      }, { status: 403 })
    }

    // Call Dropbox API
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath,
        limit: 100,
        include_mounted_folders: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error_summary: response.statusText }))
      console.error('Dropbox API error:', error)
      return NextResponse.json({
        error: `Dropbox API error: ${error.error_summary || response.statusText}`
      }, { status: response.status })
    }

    const data = await response.json()

    const items = (data.entries || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      path: item.path_display || item.path_lower,
      size: item.size || 0,
      lastModified: item.server_modified || item.client_modified || null,
      isFolder: item['.tag'] === 'folder',
    }))

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error in POST /api/dropbox/files:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
