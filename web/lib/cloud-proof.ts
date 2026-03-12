import { canonicalProofHash } from '@aramantos/crypto'

export interface CloudFile {
  path: string
  hash: string
  size: number
}

export interface CloudProofResult {
  proof_id: string
  timestamp: string
  provider: string
  automation_name: string
  total_files: number
  total_size: number
  files: CloudFile[]
  file_hashes: Record<string, string>
  hash_algorithm: string
  manifest_hash: string
}

interface SelectionItem {
  id: string
  path: string
  name: string
  type: 'file' | 'folder'
}

export interface WorkspaceHash {
  fileId: string
  path: string
  hash: string
  size: number
  exportedAs?: string
  headRevisionId?: string
}

interface Selections {
  included: SelectionItem[]
  excluded: SelectionItem[]
}

const MAX_FILES = 5000

// ─── OneDrive ───────────────────────────────────────────────────────────────

async function listOneDriveFolder(folderId: string, token: string): Promise<any[]> {
  const items: any[] = []
  const sanitizedId = folderId === 'root' ? 'root' : folderId.replace(/[^a-zA-Z0-9!_-]/g, '')
  let url = sanitizedId === 'root'
    ? 'https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,size,file,folder&$top=200'
    : `https://graph.microsoft.com/v1.0/me/drive/items/${sanitizedId}/children?$select=id,name,size,file,folder&$top=200`

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`OneDrive API error: ${err.error?.message || res.statusText}`)
    }
    const data = await res.json()
    items.push(...(data.value || []))
    url = data['@odata.nextLink'] || null
  }
  return items
}

function onedriveHashToHex(item: any): string | null {
  const hashes = item.file?.hashes
  if (!hashes) return null
  // Prefer SHA-256 (available on business accounts), fall back to SHA-1
  // OneDrive returns hashes as base64
  if (hashes.sha256Hash) return Buffer.from(hashes.sha256Hash, 'base64').toString('hex')
  if (hashes.sha1Hash) return Buffer.from(hashes.sha1Hash, 'base64').toString('hex')
  return null
}

async function expandOneDriveSelections(token: string, selections: Selections): Promise<CloudFile[]> {
  const files: CloudFile[] = []
  const excludedIds = new Set(selections.excluded.map(e => e.id))

  async function walkFolder(folderId: string, basePath: string) {
    if (files.length >= MAX_FILES) return
    const items = await listOneDriveFolder(folderId, token)

    for (const item of items) {
      if (files.length >= MAX_FILES) break
      if (excludedIds.has(item.id)) continue

      const itemPath = basePath ? `${basePath}/${item.name}` : item.name

      if (item.folder) {
        await walkFolder(item.id, itemPath)
      } else {
        const hash = onedriveHashToHex(item)
        if (hash) {
          files.push({ path: itemPath, hash, size: item.size || 0 })
        }
      }
    }
  }

  for (const sel of selections.included) {
    if (files.length >= MAX_FILES) break
    if (excludedIds.has(sel.id)) continue

    if (sel.type === 'folder') {
      await walkFolder(sel.id, sel.name)
    } else {
      // Get individual file metadata with hash
      const sanitizedId = sel.id.replace(/[^a-zA-Z0-9!_-]/g, '')
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${sanitizedId}?$select=id,name,size,file`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (res.ok) {
        const item = await res.json()
        const hash = onedriveHashToHex(item)
        if (hash) {
          files.push({ path: sel.name, hash, size: item.size || 0 })
        }
      }
    }
  }

  return files
}

// ─── Google Drive ───────────────────────────────────────────────────────────

async function listGoogleDriveFolder(folderId: string, token: string): Promise<any[]> {
  const items: any[] = []
  const sanitizedId = folderId === 'root' ? 'root' : folderId.replace(/[^a-zA-Z0-9_-]/g, '')
  let pageToken: string | null = null

  do {
    const params = new URLSearchParams({
      q: `'${sanitizedId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size,sha256Checksum,md5Checksum),nextPageToken',
      pageSize: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Google Drive API error: ${err.error?.message || res.statusText}`)
    }
    const data = await res.json()
    items.push(...(data.files || []))
    pageToken = data.nextPageToken || null
  } while (pageToken)

  return items
}

async function expandGoogleDriveSelections(
  token: string,
  selections: Selections,
  workspaceHashes?: WorkspaceHash[],
): Promise<CloudFile[]> {
  const files: CloudFile[] = []
  const excludedIds = new Set(selections.excluded.map(e => e.id))
  let skippedFiles = 0

  // Index browser-provided workspace hashes by file ID for quick lookup
  const wsHashMap = new Map<string, WorkspaceHash>()
  if (workspaceHashes) {
    for (const wh of workspaceHashes) {
      wsHashMap.set(wh.fileId, wh)
    }
  }

  async function walkFolder(folderId: string, basePath: string) {
    if (files.length >= MAX_FILES) return
    const items = await listGoogleDriveFolder(folderId, token)

    for (const item of items) {
      if (files.length >= MAX_FILES) break
      if (excludedIds.has(item.id)) continue

      const itemPath = basePath ? `${basePath}/${item.name}` : item.name

      if (item.mimeType === 'application/vnd.google-apps.folder') {
        await walkFolder(item.id, itemPath)
      } else if (item.sha256Checksum) {
        files.push({
          path: itemPath,
          hash: item.sha256Checksum.toLowerCase(),
          size: parseInt(item.size || '0', 10),
        })
      } else if (item.md5Checksum) {
        // Fallback to MD5 for files without SHA-256
        files.push({
          path: itemPath,
          hash: item.md5Checksum.toLowerCase(),
          size: parseInt(item.size || '0', 10),
        })
      } else {
        // Check for browser-provided workspace hash
        const wsHash = wsHashMap.get(item.id)
        if (wsHash) {
          files.push({
            path: itemPath,
            hash: wsHash.hash,
            size: wsHash.size,
          })
        } else {
          skippedFiles++
        }
      }
    }
  }

  for (const sel of selections.included) {
    if (files.length >= MAX_FILES) break
    if (excludedIds.has(sel.id)) continue

    if (sel.type === 'folder') {
      await walkFolder(sel.id, sel.name)
    } else {
      const sanitizedId = sel.id.replace(/[^a-zA-Z0-9_-]/g, '')
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${sanitizedId}?fields=id,name,size,sha256Checksum,md5Checksum,mimeType`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (res.ok) {
        const item = await res.json()
        const hash = item.sha256Checksum || item.md5Checksum
        if (hash) {
          files.push({
            path: sel.name,
            hash: hash.toLowerCase(),
            size: parseInt(item.size || '0', 10),
          })
        } else {
          // Check for browser-provided workspace hash
          const wsHash = wsHashMap.get(item.id)
          if (wsHash) {
            files.push({
              path: sel.name,
              hash: wsHash.hash,
              size: wsHash.size,
            })
          } else {
            skippedFiles++
          }
        }
      }
    }
  }

  if (skippedFiles > 0 && files.length === 0) {
    throw new Error(
      `No hashable files found. ${skippedFiles} file${skippedFiles !== 1 ? 's were' : ' was'} skipped — ` +
      `Google Workspace files (Docs, Sheets, Slides) cannot be hashed via API. ` +
      `Use "Run Now" from the browser to include Workspace files.`
    )
  }

  return files
}

// ─── Dropbox ────────────────────────────────────────────────────────────────

/** Ensure Dropbox paths start with / (selections store display paths without leading /) */
function ensureDropboxPath(path: string): string {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

async function listDropboxFolderRecursive(path: string, token: string): Promise<any[]> {
  const items: any[] = []

  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: path || '',
      recursive: true,
      limit: 2000,
      include_non_downloadable_files: false,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Dropbox API error: ${err.error_summary || res.statusText}`)
  }
  let data = await res.json()
  items.push(...(data.entries || []))

  while (data.has_more) {
    const contRes = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cursor: data.cursor }),
    })
    if (!contRes.ok) break
    data = await contRes.json()
    items.push(...(data.entries || []))
  }

  return items
}

async function expandDropboxSelections(token: string, selections: Selections): Promise<CloudFile[]> {
  const files: CloudFile[] = []
  const excludedIds = new Set(selections.excluded.map(e => e.id))
  const excludedPaths = selections.excluded
    .filter(e => e.type === 'folder')
    .map(e => e.path.toLowerCase())

  function isExcludedPath(itemPath: string): boolean {
    const lower = itemPath.toLowerCase()
    return excludedPaths.some(ep => lower.startsWith(ep + '/') || lower === ep)
  }

  for (const sel of selections.included) {
    if (files.length >= MAX_FILES) break
    if (excludedIds.has(sel.id)) continue

    if (sel.type === 'folder') {
      // Dropbox requires paths with leading /
      const dropboxPath = ensureDropboxPath(sel.path)
      const items = await listDropboxFolderRecursive(dropboxPath, token)
      const basePath = dropboxPath.toLowerCase()

      for (const item of items) {
        if (files.length >= MAX_FILES) break
        if (item['.tag'] !== 'file') continue
        if (excludedIds.has(item.id)) continue

        const fullPath = item.path_display || item.path_lower
        if (isExcludedPath(fullPath)) continue

        // Strip base path to get relative path, prepend selection name
        let relativePath = fullPath
        if (fullPath.toLowerCase().startsWith(basePath + '/')) {
          relativePath = fullPath.substring(dropboxPath.length + 1)
        }
        const manifestPath = `${sel.name}/${relativePath}`

        if (item.content_hash) {
          files.push({ path: manifestPath, hash: item.content_hash, size: item.size || 0 })
        }
      }
    } else {
      // Get individual file metadata — use Dropbox path (with leading /) or ID
      const filePath = sel.path ? ensureDropboxPath(sel.path) : sel.id
      const res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      })
      if (res.ok) {
        const item = await res.json()
        if (item.content_hash) {
          files.push({ path: sel.name, hash: item.content_hash, size: item.size || 0 })
        }
      }
    }
  }

  return files
}

// ─── Main proof generation ──────────────────────────────────────────────────

export async function generateCloudProof(
  provider: string,
  token: string,
  selections: Selections,
  automationName: string,
  workspaceHashes?: WorkspaceHash[],
): Promise<CloudProofResult> {
  let files: CloudFile[]
  let hashAlgorithm: string

  switch (provider) {
    case 'onedrive':
      files = await expandOneDriveSelections(token, selections)
      hashAlgorithm = 'sha256/sha1' // prefers sha256, falls back to sha1
      break
    case 'google_drive':
      files = await expandGoogleDriveSelections(token, selections, workspaceHashes)
      hashAlgorithm = 'sha256'
      break
    case 'dropbox':
      files = await expandDropboxSelections(token, selections)
      hashAlgorithm = 'dropbox_content_hash'
      break
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }

  if (files.length === 0) {
    throw new Error('No hashable files found in the selected locations')
  }

  // Disambiguate duplicate paths (e.g. two files named "Untitled document")
  // Append " (2)", " (3)" etc. to duplicates — must happen before sorting
  const pathCounts = new Map<string, number>()
  for (const f of files) {
    const count = (pathCounts.get(f.path) || 0) + 1
    pathCounts.set(f.path, count)
    if (count > 1) {
      f.path = `${f.path} (${count})`
    }
  }

  // Generate canonical proof hash using @aramantos/crypto WASM (single source of truth)
  const entries = files.map(f => ({ path: f.path, hash: f.hash }))
  const proofId = canonicalProofHash(JSON.stringify(entries))

  // Build file_hashes map (for compatibility with proof viewer)
  const fileHashes: Record<string, string> = {}
  for (const f of files) {
    fileHashes[f.path] = f.hash
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return {
    proof_id: proofId,
    timestamp: new Date().toISOString(),
    provider,
    automation_name: automationName,
    total_files: files.length,
    total_size: totalSize,
    files,
    file_hashes: fileHashes,
    hash_algorithm: hashAlgorithm,
    manifest_hash: proofId,
  }
}

const PROVIDER_DISPLAY: Record<string, string> = {
  onedrive: 'OneDrive',
  google_drive: 'Google Drive',
  dropbox: 'Dropbox',
}

export function getProviderDisplayName(provider: string): string {
  return PROVIDER_DISPLAY[provider] || provider
}
