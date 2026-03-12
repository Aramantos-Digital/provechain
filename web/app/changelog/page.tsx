'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createProveChainBrowserClient } from '@/lib/supabase/provechain-browser'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Settings, Plus, Trash2, Edit, Tag, Link, Users, CreditCard, Pin, CheckCircle2, XCircle, GitBranch, Bot, Pause, Play } from 'lucide-react'
import { hasChangelog } from '@/lib/tiers'

type AuditLog = {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: any
  created_at: string
  user_id: string
}

type Subscription = {
  tier: string
  status: string
}

export default function ChangelogPage() {
  const router = useRouter()
  const supabase = createClient()
  const hasCheckedAccess = useRef(false)

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Prevent double execution in React strict mode
    if (hasCheckedAccess.current) return
    hasCheckedAccess.current = true
    checkAccess()
  }, [])

  async function checkAccess() {
    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        setLoading(false)
        toast.error('Authentication Error', {
          description: 'Please log in to access the Changelog.',
          duration: 3000,
        })
        setTimeout(() => router.push('/login'), 1000)
        return
      }

      // Check subscription via API
      const subRes = await fetch('/api/subscription')
      if (!subRes.ok) {
        setLoading(false)
        toast.error('Upgrade Required', {
          description: 'The Changelog feature is only available for paid tier users. Please upgrade your account to access it.',
          duration: 8000,
        })
        setTimeout(() => router.push('/dashboard'), 3000)
        return
      }

      const subJson = await subRes.json()
      const subData = subJson.subscription as Subscription | null

      if (!subData || !hasChangelog(subData.tier)) {
        setLoading(false)
        toast.error('Upgrade Required', {
          description: 'The Changelog feature is only available for paid tier users (Pro, Professional, Business, or Enterprise). Please upgrade your account to access it.',
          duration: 8000,
        })
        setTimeout(() => router.push('/dashboard'), 3000)
        return
      }

      setSubscription(subData)
      setHasAccess(true)
      await fetchLogs()
    } catch (error: any) {
      console.error('[Changelog] Unexpected error:', error)
      setError(error.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  async function fetchLogs() {
    try {
      const dataClient = createProveChainBrowserClient()
      const { data, error: queryError } = await dataClient
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (queryError) {
        console.error('Error fetching logs:', queryError)
        setError('Failed to load changelog')
        setLogs([])
      } else {
        setLogs(data || [])
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error)
      setError(error.message || 'Failed to load changelog')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Filter by action type
    if (filter !== 'all' && !log.action.includes(filter)) {
      return false
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesAction = log.action.toLowerCase().includes(searchLower)
      const matchesResource = log.resource_type.toLowerCase().includes(searchLower)
      const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(searchLower)

      return matchesAction || matchesResource || matchesDetails
    }

    return true
  })

  function getActionIcon(action: string) {
    if (action.includes('version_created')) return <GitBranch className="h-4 w-4" />
    if (action.includes('verification_passed')) return <CheckCircle2 className="h-4 w-4" />
    if (action.includes('verification_failed')) return <XCircle className="h-4 w-4" />
    if (action.includes('verified')) return <CheckCircle2 className="h-4 w-4" />
    if (action.includes('moved') || action.includes('copied')) return <Users className="h-4 w-4" />
    if (action.includes('team')) return <Users className="h-4 w-4" />
    if (action.includes('tagged') || action.includes('untagged')) return <Tag className="h-4 w-4" />
    if (action.includes('tag_')) return <Tag className="h-4 w-4" />
    if (action.includes('automated') && action.includes('activated')) return <Play className="h-4 w-4" />
    if (action.includes('automated') && action.includes('deactivated')) return <Pause className="h-4 w-4" />
    if (action.includes('automated')) return <Bot className="h-4 w-4" />
    if (action.includes('created')) return <Plus className="h-4 w-4" />
    if (action.includes('deleted')) return <Trash2 className="h-4 w-4" />
    if (action.includes('updated')) return <Edit className="h-4 w-4" />
    if (action.includes('combined')) return <Link className="h-4 w-4" />
    if (action.includes('subscription')) return <CreditCard className="h-4 w-4" />
    return <Pin className="h-4 w-4" />
  }

  function getActionColor(action: string) {
    if (action.includes('version_created')) return 'text-amber-700 bg-amber-100 text-amber-300 bg-amber-900/30'
    if (action.includes('verification_passed')) return 'text-green-700 bg-green-100 text-green-300 bg-green-900/30'
    if (action.includes('verification_failed')) return 'text-red-700 bg-red-100 text-red-300 bg-red-900/30'
    if (action.includes('verified')) return 'text-green-700 bg-green-100 text-green-300 bg-green-900/30'
    if (action.includes('moved') || action.includes('copied')) return 'text-indigo-700 bg-indigo-100 text-indigo-300 bg-indigo-900/30'
    if (action.includes('team')) return 'text-indigo-700 bg-indigo-100 text-indigo-300 bg-indigo-900/30'
    if (action.includes('tagged') || action.includes('untagged')) return 'text-blue-700 bg-blue-100 text-blue-300 bg-blue-900/30'
    if (action.includes('tag_')) return 'text-cyan-700 bg-cyan-100 text-cyan-300 bg-cyan-900/30'
    if (action.includes('automated') && action.includes('deactivated')) return 'text-yellow-700 bg-yellow-100 text-yellow-300 bg-yellow-900/30'
    if (action.includes('automated') && action.includes('activated')) return 'text-emerald-700 bg-emerald-100 text-emerald-300 bg-emerald-900/30'
    if (action.includes('automated')) return 'text-teal-700 bg-teal-100 text-teal-300 bg-teal-900/30'
    if (action.includes('created')) return 'text-green-700 bg-green-100 text-green-300 bg-green-900/30'
    if (action.includes('deleted')) return 'text-red-700 bg-red-100 text-red-300 bg-red-900/30'
    if (action.includes('updated')) return 'text-purple-700 bg-purple-100 text-purple-300 bg-purple-900/30'
    if (action.includes('combined')) return 'text-cyan-700 bg-cyan-100 text-cyan-300 bg-cyan-900/30'
    if (action.includes('subscription')) return 'text-pink-700 bg-pink-100 text-pink-300 bg-pink-900/30'
    return 'text-gray-700 bg-gray-100 text-gray-300 bg-gray-900/30'
  }

  const PROVIDER_NAMES: Record<string, string> = {
    onedrive: 'OneDrive',
    dropbox: 'Dropbox',
    google_drive: 'Google Drive',
    github: 'GitHub',
  }

  function formatAction(action: string, details?: any) {
    // Better titles for automation entries
    if (action.includes('automated_source') || action.includes('automated_repo')) {
      const isSource = action.includes('automated_source')
      const provider = details?.provider ? PROVIDER_NAMES[details.provider] || details.provider : null
      const itemName = details?.name || details?.repo_full_name || null

      let verb = 'Updated'
      if (action.includes('created')) verb = 'Created'
      else if (action.includes('deleted')) verb = 'Deleted'
      else if (action.includes('activated')) verb = 'Activated'
      else if (action.includes('deactivated')) verb = 'Paused'

      if (itemName) {
        return `${verb}: ${itemName}`
      }
      const type = isSource ? 'Automation' : 'Repository'
      return provider ? `${provider} ${type} ${verb}` : `${type} ${verb}`
    }

    if (action === 'automated_proof_created') {
      return 'Automated Proof Generated'
    }

    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Don't render anything until access check is complete
  if (loading || !hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show error state (only if access was granted but logs failed to load)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-red-50 bg-red-900/20 border border-red-200 border-red-800 rounded-xl p-6">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 text-red-100 mb-2">Error Loading Changelog</h2>
            <p className="text-red-700 text-red-300 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium bg-gray-800 border border-gray-300 border-gray-700 rounded-lg hover:bg-gray-50 hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-7xl">
      <div className="mb-4">
        {/* Row 1: Title + Back to Dashboard Button */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent text-center md:text-left flex-1">
            Changelog
          </h1>

          {/* Back to Dashboard Button - Desktop */}
          <button
            onClick={() => router.push('/dashboard')}
            className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Row 2: Description + Account Settings Button */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground flex-1">
            Complete audit trail of all your actions
          </p>

          {/* Buttons Column - Mobile */}
          <div className="md:hidden flex flex-col gap-2 flex-shrink-0">
            {/* Back to Dashboard Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              ← Dashboard
            </button>

            {/* Account Settings Button */}
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Account Settings Button - Desktop */}
          <button
            onClick={() => router.push('/settings')}
            className="hidden md:flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg hover:shadow-xl flex-shrink-0 min-w-[200px]"
          >
            <Settings className="h-4 w-4" />
            <span>Account Settings</span>
          </button>
        </div>
      </div>

      <div className="">
        {/* Filters */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search changelog..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 border-gray-700 rounded-lg bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter by action */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 border-gray-700 rounded-lg bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="proof">Proof Actions</option>
              <option value="automated">Automation Actions</option>
              <option value="tag">Tag Actions</option>
              <option value="version">Version Actions</option>
              <option value="team">Team Actions</option>
              <option value="subscription">Subscription Actions</option>
            </select>
          </div>
        </div>

        {/* Changelog Timeline */}
        {filteredLogs.length === 0 ? (
          <div className="bg-card/30 backdrop-blur-sm border-2 border-dashed border-border rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">
              No activity yet
            </h3>
            <p className="text-muted-foreground">
              Your changelog will appear here as you create and manage proofs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <div
                key={log.id}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Action and time */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {formatAction(log.action, log.details)}
                      </h3>
                      <time className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy · h:mm a')}
                      </time>
                    </div>

                    {/* Resource type */}
                    <p className="text-sm text-muted-foreground mb-3">
                      {log.resource_type === 'automated_source' ? (
                        <span className="font-medium text-foreground">
                          {log.details?.provider ? (PROVIDER_NAMES[log.details.provider] || log.details.provider) + ' Automation' : 'Cloud Automation'}
                        </span>
                      ) : log.resource_type === 'automated_repo' ? (
                        <span className="font-medium text-foreground">
                          GitHub Automation
                        </span>
                      ) : (
                        <>
                          Resource: <span className="font-medium text-foreground">{log.resource_type}</span>
                          {log.resource_id && (
                            <span className="ml-2 text-muted-foreground/70">
                              · ID: {log.resource_id.slice(0, 8)}...
                            </span>
                          )}
                        </>
                      )}
                    </p>

                    {/* Details */}
                    {log.details && (
                      <div className="bg-muted/50 rounded-lg p-3 border border-border">
                        <div className="space-y-1">
                          {log.details.proof_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Proof:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.proof_name}
                              </span>
                            </div>
                          )}
                          {log.details.proof_names && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Proofs:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.proof_names.join(', ')}
                              </span>
                            </div>
                          )}
                          {log.details.proof_count && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Count:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.proof_count} proof{log.details.proof_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {log.details.destination && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Destination:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.destination}
                              </span>
                            </div>
                          )}
                          {log.details.file_hash && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Hash:</span>{' '}
                              <span className="font-mono text-xs text-muted-foreground">
                                {log.details.file_hash.slice(0, 16)}...
                              </span>
                            </div>
                          )}
                          {log.details.version_number && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Version:</span>{' '}
                              <span className="font-medium text-foreground">
                                v{log.details.version_number}
                              </span>
                            </div>
                          )}
                          {log.details.tag_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Tag:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.tag_name}
                              </span>
                              {log.details.tag_color && (
                                <span
                                  className="inline-block w-3 h-3 rounded-full ml-2"
                                  style={{ backgroundColor: log.details.tag_color }}
                                />
                              )}
                            </div>
                          )}
                          {log.details.team_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Team:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.team_name}
                              </span>
                            </div>
                          )}
                          {log.details.invitee_email && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Invited:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.invitee_email}
                              </span>
                            </div>
                          )}
                          {log.details.invited_role && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Role:</span>{' '}
                              <span className="font-medium text-foreground capitalize">
                                {log.details.invited_role}
                              </span>
                            </div>
                          )}
                          {log.details.changes && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Changes:</span>{' '}
                              <ul className="list-disc list-inside ml-4 mt-1">
                                {log.details.changes.name_changed && (
                                  <li className="text-muted-foreground">Name updated</li>
                                )}
                                {log.details.changes.description_changed && (
                                  <li className="text-muted-foreground">Description updated</li>
                                )}
                                {log.details.changes.date_changed && (
                                  <li className="text-muted-foreground">Date updated</li>
                                )}
                                {log.details.changes.notes_changed && (
                                  <li className="text-muted-foreground">Notes updated</li>
                                )}
                              </ul>
                            </div>
                          )}
                          {log.details.provider && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Provider:</span>{' '}
                              <span className="font-medium text-foreground">
                                {PROVIDER_NAMES[log.details.provider] || log.details.provider}
                              </span>
                            </div>
                          )}
                          {log.details.repo_full_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Repository:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.repo_full_name}
                              </span>
                            </div>
                          )}
                          {log.details.name && !log.details.proof_name && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Automation:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.name}
                              </span>
                            </div>
                          )}
                          {log.details.schedule && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Schedule:</span>{' '}
                              <span className="font-medium text-foreground capitalize">
                                {log.details.schedule}
                              </span>
                            </div>
                          )}
                          {log.details.updates && Array.isArray(log.details.updates) && log.details.updates.length > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Updates:</span>{' '}
                              <span className="font-medium text-foreground">
                                {log.details.updates.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show count */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      </div>
    </div>
  )
}
