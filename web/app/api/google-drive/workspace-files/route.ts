import { getAuthContext } from '@/lib/auth-context'
import { getProviderToken } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

const WORKSPACE_MIME_TYPES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
])

const SKIP_MIME_TYPES = new Set([
  'application/vnd.google-apps.form',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.map',
  'application/vnd.google-apps.site',
])

interface SelectionItem {
  id: string
  path: string
  name: string
  type: 'file' | 'folder'
}

interface Selections {
  included: SelectionItem[]
  excluded: SelectionItem[]
}

interface WorkspaceFile {
  id: string
  name: string
  path: string
  mimeType: string
}

// POST /api/google-drive/workspace-files — Discover Workspace files in an automation's selections
// Returns metadata only (no file content), so the browser can export and hash them locally
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const body = await request.json()
    const { automated_source_id } = body

    if (!automated_source_id) {
      return NextResponse.json({ error: 'Missing automated_source_id' }, { status: 400 })
    }

    // Get automation
    const { data: automation, error } = await supabase
      .from('automated_sources')
      .select('id, provider, selections')
      .eq('id', automated_source_id)
      .eq('user_id', user.id)
      .single()

    if (error || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    if (automation.provider !== 'google_drive') {
      return NextResponse.json({ workspace_files: [] })
    }

    // Get token
    const token = await getProviderToken(user.id, 'google_drive')
    if (!token) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 403 })
    }

    const selections: Selections = automation.selections
    const excludedIds = new Set(selections.excluded.map(e => e.id))
    const workspaceFiles: WorkspaceFile[] = []

    // Walk selections to find Workspace files
    const listFolder = async (folderId: string): Promise<any[]> => {
      const items: any[] = []
      const sanitizedId = folderId === 'root' ? 'root' : folderId.replace(/[^a-zA-Z0-9_-]/g, '')
      let pageToken: string | null = null

      do {
        const params = new URLSearchParams({
          q: `'${sanitizedId}' in parents and trashed = false`,
          fields: 'files(id,name,mimeType),nextPageToken',
          pageSize: '100',
        })
        if (pageToken) params.set('pageToken', pageToken)

        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (!res.ok) break
        const data = await res.json()
        items.push(...(data.files || []))
        pageToken = data.nextPageToken || null
      } while (pageToken)

      return items
    }

    const walkFolder = async (folderId: string, basePath: string) => {
      const items = await listFolder(folderId)
      for (const item of items) {
        if (excludedIds.has(item.id)) continue
        const itemPath = basePath ? `${basePath}/${item.name}` : item.name

        if (item.mimeType === 'application/vnd.google-apps.folder') {
          await walkFolder(item.id, itemPath)
        } else if (WORKSPACE_MIME_TYPES.has(item.mimeType)) {
          workspaceFiles.push({ id: item.id, name: item.name, path: itemPath, mimeType: item.mimeType })
        }
        // Regular files and skippable types are ignored — server handles regular files
      }
    }

    for (const sel of selections.included) {
      if (excludedIds.has(sel.id)) continue

      if (sel.type === 'folder') {
        await walkFolder(sel.id, sel.name)
      } else {
        // Individual file — check its mimeType
        const sanitizedId = sel.id.replace(/[^a-zA-Z0-9_-]/g, '')
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${sanitizedId}?fields=id,name,mimeType`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
        )
        if (res.ok) {
          const item = await res.json()
          if (WORKSPACE_MIME_TYPES.has(item.mimeType)) {
            workspaceFiles.push({ id: item.id, name: item.name, path: sel.name, mimeType: item.mimeType })
          }
        }
      }
    }

    return NextResponse.json({ workspace_files: workspaceFiles })
  } catch (error: any) {
    console.error('Error in POST /api/google-drive/workspace-files:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
