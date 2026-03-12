/**
 * Browser-side Google Workspace file export and hashing
 *
 * Exports Workspace files (Docs, Sheets, Slides) to deterministic text formats
 * and hashes them locally using Web Crypto API. File content never leaves the browser.
 */

/** Workspace MIME types → deterministic export formats */
const EXPORT_FORMATS: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
}

export interface WorkspaceFileInfo {
  id: string
  name: string
  path: string
  mimeType: string
}

export interface WorkspaceHashResult {
  fileId: string
  path: string
  hash: string
  size: number
  exportedAs: string
  headRevisionId?: string
}

export interface WorkspaceHashError {
  fileId: string
  path: string
  name: string
  error: string
}

export interface WorkspaceHashReport {
  hashes: WorkspaceHashResult[]
  errors: WorkspaceHashError[]
}

/** Check if a mimeType is an exportable Google Workspace type */
export function isWorkspaceMimeType(mimeType: string): boolean {
  return mimeType in EXPORT_FORMATS
}

/** SHA-256 hash a string using Web Crypto API */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Get the headRevisionId for a file */
async function getHeadRevisionId(token: string, fileId: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.ok) {
      const data = await res.json()
      return data.headRevisionId
    }
  } catch {
    // Non-critical — just metadata enrichment
  }
  return undefined
}

/** Get sheet tab metadata for a spreadsheet */
async function getSheetTabs(token: string, fileId: string): Promise<Array<{ title: string; sheetId: number; index: number }>> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new Error(`Failed to get sheet tabs: ${res.statusText}`)
  }
  const data = await res.json()
  return (data.sheets || [])
    .map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
      index: s.properties.index,
    }))
    .sort((a: any, b: any) => a.index - b.index)
}

/** Export a single sheet tab as CSV via Sheets API */
async function exportSheetTab(token: string, fileId: string, tabTitle: string): Promise<string> {
  const encodedTitle = encodeURIComponent(tabTitle)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodedTitle}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new Error(`Failed to export sheet tab "${tabTitle}": ${res.statusText}`)
  }
  const data = await res.json()
  const rows: string[][] = data.values || []

  // Convert to CSV deterministically
  return rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '')
      // Quote cells containing commas, quotes, or newlines
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }).join(',')
  ).join('\n')
}

/**
 * Export and hash a single Google Workspace file
 *
 * - Docs/Slides: exported as text/plain via Drive API
 * - Sheets: each tab exported as CSV via Sheets API, concatenated in tab order
 */
async function exportAndHash(
  token: string,
  file: WorkspaceFileInfo,
): Promise<WorkspaceHashResult> {
  const exportMime = EXPORT_FORMATS[file.mimeType]
  let content: string
  let exportedAs = exportMime

  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Multi-tab sheet handling: export each tab via Sheets API
    try {
      const tabs = await getSheetTabs(token, file.id)
      const tabContents: string[] = []

      for (const tab of tabs) {
        const csv = await exportSheetTab(token, file.id, tab.title)
        tabContents.push(csv)
      }

      // Concatenate all tabs with a deterministic separator
      content = tabContents.join('\n---SHEET_SEPARATOR---\n')
      exportedAs = `text/csv (${tabs.length} tab${tabs.length !== 1 ? 's' : ''})`
    } catch {
      // Fallback: export first sheet via Drive API
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const status = res.status
        if (status === 403) {
          throw new Error('Export size limit exceeded (10MB)')
        }
        throw new Error(`Export failed: ${res.statusText}`)
      }
      content = await res.text()
      exportedAs = 'text/csv (first tab only — fallback)'
    }
  } else {
    // Docs and Slides: export as plain text via Drive API
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      const status = res.status
      if (status === 403) {
        throw new Error('Export size limit exceeded (10MB)')
      }
      throw new Error(`Export failed: ${res.statusText}`)
    }
    content = await res.text()
  }

  const hash = await sha256(content)
  const size = new TextEncoder().encode(content).length
  const headRevisionId = await getHeadRevisionId(token, file.id)

  return {
    fileId: file.id,
    path: file.path,
    hash,
    size,
    exportedAs,
    headRevisionId,
  }
}

/**
 * Export and hash all Google Workspace files in the browser
 *
 * @param token - Google OAuth access token
 * @param files - List of Workspace files to export and hash
 * @param onProgress - Optional callback for progress updates
 * @returns Report with successful hashes and any errors
 */
export async function exportAndHashWorkspaceFiles(
  token: string,
  files: WorkspaceFileInfo[],
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<WorkspaceHashReport> {
  const hashes: WorkspaceHashResult[] = []
  const errors: WorkspaceHashError[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(i + 1, files.length, file.name)

    try {
      const result = await exportAndHash(token, file)
      hashes.push(result)
    } catch (error: any) {
      errors.push({
        fileId: file.id,
        path: file.path,
        name: file.name,
        error: error.message || 'Unknown error',
      })
    }
  }

  return { hashes, errors }
}
