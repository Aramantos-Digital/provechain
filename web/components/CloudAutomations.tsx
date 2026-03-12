'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Folder, FileText, ChevronRight, Loader2, RefreshCw,
  Plus, Trash2, FolderOpen, X, Check, Pause, Play, Info,
  CheckCircle2, AlertCircle, Clock, FolderEdit, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ConfirmModal'
import { exportAndHashWorkspaceFiles, type WorkspaceHashResult } from '@/lib/workspace-hash'

// ── Types ──

interface AutomatedSource {
  id: string
  provider: string
  name: string
  selections: Selections
  schedule: string
  last_run_at: string | null
  last_status: string | null
  last_error: string | null
  last_proof_id: string | null
  is_active: boolean
  created_at: string
}

interface CloudFileItem {
  id: string
  name: string
  path?: string
  size: number
  lastModified: string | null
  isFolder: boolean
  childCount?: number
  webUrl?: string
}

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

interface BreadcrumbItem {
  key: string
  name: string
}

interface CloudAutomationsProps {
  provider: 'onedrive' | 'dropbox' | 'google_drive'
  providerName: string
  gradient: string
}

// ── Helpers ──

async function fetchFiles(provider: string, folderKey: string): Promise<CloudFileItem[]> {
  let res: Response
  if (provider === 'dropbox') {
    res = await fetch('/api/dropbox/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: folderKey }),
    })
  } else {
    const endpoint = provider === 'onedrive' ? '/api/onedrive/files' : '/api/google-drive/files'
    res = await fetch(`${endpoint}?folderId=${folderKey}`)
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load files')

  return (data.items || []).sort((a: CloudFileItem, b: CloudFileItem) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })
}

function buildItemPath(breadcrumbs: BreadcrumbItem[], itemName: string): string {
  const parts = breadcrumbs.slice(1).map(b => b.name)
  return [...parts, itemName].join('/')
}

function isItemSelected(itemId: string, itemPath: string, selections: Selections): boolean {
  if (selections.excluded.some(e => e.id === itemId)) return false
  if (selections.included.some(i => i.id === itemId)) return true
  return selections.included.some(i =>
    i.type === 'folder' && itemPath.startsWith(i.path + '/')
  )
}

function toggleSelection(
  item: CloudFileItem,
  breadcrumbs: BreadcrumbItem[],
  selections: Selections,
): Selections {
  const itemPath = buildItemPath(breadcrumbs, item.name)
  const selItem: SelectionItem = {
    id: item.id,
    path: itemPath,
    name: item.name,
    type: item.isFolder ? 'folder' : 'file',
  }
  const isSelected = isItemSelected(item.id, itemPath, selections)

  if (isSelected) {
    let newIncluded = selections.included.filter(i => i.id !== item.id)
    let newExcluded = [...selections.excluded]
    const isInherited = selections.included.some(i =>
      i.type === 'folder' && i.id !== item.id && itemPath.startsWith(i.path + '/')
    )
    if (isInherited) {
      newExcluded.push(selItem)
    }
    if (item.isFolder && selections.included.some(i => i.id === item.id)) {
      newExcluded = newExcluded.filter(e => !e.path.startsWith(itemPath + '/'))
      newIncluded = newIncluded.filter(i => !i.path.startsWith(itemPath + '/'))
    }
    return { included: newIncluded, excluded: newExcluded }
  } else {
    let newIncluded = [...selections.included, selItem]
    let newExcluded = selections.excluded.filter(e => e.id !== item.id)
    if (item.isFolder) {
      newIncluded = newIncluded.filter(i =>
        i.id === item.id || !i.path.startsWith(itemPath + '/')
      )
      newExcluded = newExcluded.filter(e => !e.path.startsWith(itemPath + '/'))
    }
    return { included: newIncluded, excluded: newExcluded }
  }
}

function getSelectionSummary(selections: Selections): { folders: number; files: number } {
  return {
    folders: selections.included.filter(i => i.type === 'folder').length,
    files: selections.included.filter(i => i.type === 'file').length,
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function selectionLabel(s: Selections): string {
  const { folders, files } = getSelectionSummary(s)
  const parts: string[] = []
  if (folders > 0) parts.push(`${folders} folder${folders !== 1 ? 's' : ''}`)
  if (files > 0) parts.push(`${files} file${files !== 1 ? 's' : ''}`)
  return parts.join(', ') || 'No items'
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'success':
      return <span className="flex items-center gap-1 text-green-400 font-medium"><CheckCircle2 className="w-4 h-4" /> Success</span>
    case 'error':
      return <span className="flex items-center gap-1 text-red-400 font-medium"><AlertCircle className="w-4 h-4" /> Error</span>
    case 'skipped':
      return <span className="flex items-center gap-1 text-yellow-400 font-medium"><Clock className="w-4 h-4" /> Skipped</span>
    default:
      return <span className="flex items-center gap-1 text-muted-foreground font-medium"><Clock className="w-4 h-4" /> Pending</span>
  }
}

// ── Component ──

export default function CloudAutomations({ provider, providerName, gradient }: CloudAutomationsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [view, setView] = useState<'list' | 'select'>('list')
  const [loading, setLoading] = useState(true)

  // Automation list
  const [automations, setAutomations] = useState<AutomatedSource[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSchedule, setNewSchedule] = useState('daily')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [infoSource, setInfoSource] = useState<AutomatedSource | null>(null)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // File picker
  const [items, setItems] = useState<CloudFileItem[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([])
  const [selections, setSelections] = useState<Selections>({ included: [], excluded: [] })

  const rootBreadcrumb: BreadcrumbItem = {
    key: provider === 'dropbox' ? '' : 'root',
    name: providerName,
  }

  // ── Data loading ──

  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetch(`/api/automated-sources?provider=${provider}`)
      const data = await res.json()
      if (data.success) setAutomations(data.automatedSources || [])
    } catch (error) {
      console.error('Failed to load automations:', error)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      loadAutomations()
    })
    fetch('/api/automated-sources/grace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cleanup', provider }),
    }).catch(() => {})
  }, [])

  const loadFiles = useCallback(async (folderKey: string) => {
    setFileLoading(true)
    try {
      setItems(await fetchFiles(provider, folderKey))
    } catch (error: any) {
      toast.error(error.message)
      setItems([])
    } finally {
      setFileLoading(false)
    }
  }, [provider])

  // ── Actions ──

  function startFileSelection(existingSelections?: Selections) {
    setSelections(existingSelections || { included: [], excluded: [] })
    setBreadcrumbs([rootBreadcrumb])
    setView('select')
    loadFiles(rootBreadcrumb.key)
  }

  function navigateToFolder(item: CloudFileItem) {
    const key = provider === 'dropbox' ? (item.path || item.id) : item.id
    setBreadcrumbs(prev => [...prev, { key, name: item.name }])
    loadFiles(key)
  }

  function navigateToBreadcrumb(index: number) {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newBreadcrumbs)
    loadFiles(newBreadcrumbs[newBreadcrumbs.length - 1].key)
  }

  async function saveAutomation() {
    const { folders, files } = getSelectionSummary(selections)
    if (folders === 0 && files === 0) {
      toast.error('Select at least one file or folder')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch('/api/automated-sources', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, selections }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
        toast.success('Automation updated')
      } else {
        const res = await fetch('/api/automated-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, name: newName.trim(), selections, schedule: newSchedule }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create')
        toast.success(`Automation "${newName.trim()}" created`)
      }
      setView('list')
      setEditingId(null)
      setNewName('')
      setNewSchedule('daily')
      await loadAutomations()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAutomation(id: string) {
    try {
      const res = await fetch(`/api/automated-sources?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      toast.success('Automation deleted')
      await loadAutomations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function updateSchedule(id: string, schedule: string) {
    try {
      const res = await fetch('/api/automated-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, schedule }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(`Schedule changed to ${schedule.charAt(0).toUpperCase() + schedule.slice(1)}`)
      await loadAutomations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const res = await fetch('/api/automated-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast.success(currentActive ? 'Automation paused' : 'Automation resumed')
      await loadAutomations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function runNow(id: string, name: string) {
    setRunningId(id)
    try {
      let workspaceHashes: WorkspaceHashResult[] | undefined

      // For Google Drive: check for Workspace files that need browser-side hashing
      if (provider === 'google_drive') {
        const discoverRes = await fetch('/api/google-drive/workspace-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ automated_source_id: id }),
        })
        const discoverData = await discoverRes.json()
        if (!discoverRes.ok) throw new Error(discoverData.error || 'Failed to discover workspace files')

        if (discoverData.workspace_files?.length > 0) {
          const wsFiles = discoverData.workspace_files
          toast.info(`Exporting ${wsFiles.length} Workspace file${wsFiles.length !== 1 ? 's' : ''}...`, { duration: 10000 })

          // Get OAuth token for direct Google API calls from browser
          const tokenRes = await fetch('/api/google-drive/token')
          const tokenData = await tokenRes.json()
          if (!tokenRes.ok) throw new Error(tokenData.error || 'Failed to get Google token')

          // Export and hash Workspace files in the browser
          const report = await exportAndHashWorkspaceFiles(
            tokenData.token,
            wsFiles,
            (_current, _total, fileName) => {
              toast.info(`Hashing: ${fileName}`, { id: 'ws-hash-progress', duration: 10000 })
            },
          )

          toast.dismiss('ws-hash-progress')

          if (report.errors.length > 0) {
            const skippedNames = report.errors.map(e => e.name).join(', ')
            toast.warning(`Skipped ${report.errors.length} file${report.errors.length !== 1 ? 's' : ''}: ${skippedNames}`)
          }

          if (report.hashes.length > 0) {
            workspaceHashes = report.hashes
          }
        }
      }

      const res = await fetch('/api/automated-sources/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automated_source_id: id,
          workspace_hashes: workspaceHashes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate proof')

      if (data.skipped) {
        toast.info(`No changes detected for "${name}"`)
      } else {
        toast.success(`Proof created for "${name}" (${data.cloudProof?.total_files || 0} files)`)
      }
      await loadAutomations()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setRunningId(null)
    }
  }

  async function updateName(id: string, name: string) {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/automated-sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: name.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
      toast.success('Name updated')
      await loadAutomations()
      setInfoSource(prev => prev ? { ...prev, name: name.trim() } : null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingName(false)
    }
  }

  function openInfoModal(auto: AutomatedSource) {
    setInfoSource(auto)
    setEditName(auto.name)
  }

  // ══════════════════════════════════════════
  //  FILE PICKER VIEW
  // ══════════════════════════════════════════

  if (view === 'select') {
    const { folders: selFolders, files: selFiles } = getSelectionSummary(selections)

    return (
      <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              Select Files
            </h1>
            <button
              onClick={() => router.push('/connected-services')}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Connected Services</span>
            </button>
          </div>
          <p className="text-muted-foreground">
            {editingId ? 'Update file selections for your automation.' : `Selecting files for "${newName}".`}
          </p>
        </div>

        <div className="bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-xl p-6">
          {/* Selection summary + actions */}
          <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-border">
            <div className="text-sm font-medium">
              {selFolders === 0 && selFiles === 0 ? (
                <span className="text-muted-foreground">No items selected</span>
              ) : (
                <span>
                  {selFolders > 0 && `${selFolders} folder${selFolders !== 1 ? 's' : ''}`}
                  {selFolders > 0 && selFiles > 0 && ', '}
                  {selFiles > 0 && `${selFiles} file${selFiles !== 1 ? 's' : ''}`}
                  {' selected'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setView('list'); setEditingId(null) }}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-background/50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveAutomation}
                disabled={saving || (selFolders === 0 && selFiles === 0)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Update' : 'Create Automation'}
              </button>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.key}-${index}`} className="flex items-center gap-1 flex-shrink-0">
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`px-2 py-1 rounded hover:bg-background/50 transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
            <button
              onClick={() => loadFiles(breadcrumbs[breadcrumbs.length - 1].key)}
              className="ml-auto p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* File list */}
          <div className="border border-border rounded-lg overflow-hidden">
            {fileLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>This folder is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const itemPath = buildItemPath(breadcrumbs, item.name)
                  const selected = isItemSelected(item.id, itemPath, selections)

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-background/50 transition-colors ${
                        selected ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => setSelections(prev => toggleSelection(item, breadcrumbs, prev))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-muted-foreground/40 hover:border-purple-400'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </button>

                      {/* Content — click navigates folders */}
                      <div
                        className={`flex items-center gap-3 flex-1 min-w-0 ${item.isFolder ? 'cursor-pointer' : ''}`}
                        onClick={() => item.isFolder && navigateToFolder(item)}
                      >
                        {item.isFolder ? (
                          <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.isFolder && item.childCount != null && item.childCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {item.childCount} item{item.childCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                        {!item.isFolder && item.size > 0 && (
                          <span>{formatBytes(item.size)}</span>
                        )}
                        {item.lastModified && (
                          <span className="hidden sm:inline">
                            {new Date(item.lastModified).toLocaleDateString('en-IE')}
                          </span>
                        )}
                        {item.isFolder && (
                          <ChevronRight
                            className="h-4 w-4 cursor-pointer hover:text-foreground"
                            onClick={() => navigateToFolder(item)}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════
  //  AUTOMATION LIST VIEW
  // ══════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-4xl">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {providerName}
          </h1>
          <button
            onClick={() => router.push('/connected-services')}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Connected Services</span>
          </button>
        </div>
        <p className="text-muted-foreground">
          Automatically generate cryptographic proofs from your {providerName} files on a schedule.
        </p>
      </div>

      {/* Main card — matches GitHub style */}
      <div className="bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <FolderOpen className="w-6 h-6" />
            Automated {providerName} Proofs
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically generate proofs from your {providerName} folders and files
          </p>
        </div>

        {automations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No automations configured</p>
            <p className="text-sm mt-1">Click &quot;Add Automation&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className="bg-background/50 border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
              >
                {/* Row 1: Name */}
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground truncate">{auto.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({selectionLabel(auto.selections)})
                  </span>
                </div>

                {/* Row 2: Control Bar */}
                <div className="flex items-center justify-center mb-3 bg-background/50 border border-primary/20 rounded-lg overflow-hidden divide-x divide-primary/20">
                  <button
                    onClick={() => openInfoModal(auto)}
                    className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                    title="Automation info"
                  >
                    <Info className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(auto.id)
                      startFileSelection(auto.selections)
                    }}
                    className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                    title="Edit file selections"
                  >
                    <FolderEdit className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => runNow(auto.id, auto.name)}
                    disabled={runningId !== null}
                    className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group disabled:opacity-50"
                    title="Run now"
                  >
                    {runningId === auto.id ? (
                      <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-muted-foreground group-hover:text-green-400 transition-colors fill-current" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleActive(auto.id, auto.is_active)}
                    className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                    title={auto.is_active ? 'Pause automation' : 'Resume automation'}
                  >
                    {auto.is_active ? (
                      <Pause className="w-4 h-4 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
                    ) : (
                      <Play className="w-4 h-4 text-muted-foreground group-hover:text-green-400 transition-colors fill-current" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(auto.id)
                      setDeleteName(auto.name)
                    }}
                    className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                    title="Delete automation"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
                  </button>
                </div>

                {/* Row 3: Status indicators */}
                <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <select
                      value={auto.schedule}
                      onChange={(e) => updateSchedule(auto.id, e.target.value)}
                      className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded font-medium border border-blue-500/20 text-xs cursor-pointer appearance-auto"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    {!auto.is_active && (
                      <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded font-medium border border-yellow-500/20">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {getStatusBadge(auto.last_status)}
                    </div>
                    {auto.last_run_at && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(auto.last_run_at).toLocaleDateString('en-IE')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {auto.last_error && (
                  <div className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
                    {auto.last_error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Automation button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Automation
        </button>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border-2 border-primary/30 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  New Automation
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Weekly Contracts Backup"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule</label>
                  <select
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewName('')
                    setNewSchedule('daily')
                  }}
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg hover:bg-background/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newName.trim()) {
                      toast.error('Please enter a name')
                      return
                    }
                    setShowCreateModal(false)
                    startFileSelection()
                  }}
                  disabled={!newName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Select Files
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {infoSource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setInfoSource(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border-2 border-primary/30 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Automation Details
                </h3>
                <button
                  onClick={() => setInfoSource(null)}
                  className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Editable Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => updateName(infoSource.id, editName)}
                    disabled={savingName || editName.trim() === infoSource.name}
                    className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-background/30 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                    <Folder className="w-4 h-4" />
                    <span className="font-semibold">
                      {infoSource.selections.included.filter(i => i.type === 'folder').length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Folders</p>
                </div>
                <div className="p-3 bg-background/30 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="font-semibold">
                      {infoSource.selections.included.filter(i => i.type === 'file').length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Files</p>
                </div>
                <div className="p-3 bg-background/30 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold capitalize">{infoSource.schedule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                </div>
                <div className="p-3 bg-background/30 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {getStatusBadge(infoSource.last_status)}
                  </div>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
              </div>

              {/* Included items */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Included</h4>
                <div className="p-3 bg-background/50 rounded-lg max-h-48 overflow-y-auto">
                  {infoSource.selections.included.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items selected</p>
                  ) : (
                    <div className="space-y-1">
                      {infoSource.selections.included.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          {item.type === 'folder' ? (
                            <Folder className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-foreground truncate">{item.path}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Excluded items */}
              {infoSource.selections.excluded.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Excluded</h4>
                  <div className="p-3 bg-background/50 rounded-lg max-h-32 overflow-y-auto">
                    <div className="space-y-1">
                      {infoSource.selections.excluded.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          {item.type === 'folder' ? (
                            <Folder className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-muted-foreground truncate line-through">{item.path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {infoSource.last_error && (
                <div className="mb-4 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-3">
                  <span className="font-medium">Last error:</span> {infoSource.last_error}
                </div>
              )}

              {/* Dates */}
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Created: {new Date(infoSource.created_at).toLocaleDateString('en-IE')}</span>
                {infoSource.last_run_at && (
                  <span>Last run: {new Date(infoSource.last_run_at).toLocaleDateString('en-IE')}</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteName('') }}
        onConfirm={() => {
          if (deleteId) {
            deleteAutomation(deleteId)
            setDeleteId(null)
            setDeleteName('')
          }
        }}
        title="Delete Automation"
        message={`Are you sure you want to delete automated proofs for "${deleteName}"? This will stop future automatic backups, but existing proofs will be preserved.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
