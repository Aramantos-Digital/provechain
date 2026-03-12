'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, Plus, X, Play, Pause, Trash2, Clock, CheckCircle2, AlertCircle, Loader2, Info, ExternalLink, Star, GitFork, Eye } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from './ConfirmModal'

interface GitHubRepo {
  id: number
  full_name: string
  name: string
  owner: string
  html_url: string
  description: string | null
  private: boolean
  default_branch: string
}

interface AutomatedRepo {
  id: string
  repo_full_name: string
  repo_url: string
  repo_owner: string
  repo_name: string
  schedule: 'daily' | 'weekly'
  last_commit_sha: string | null
  last_run_at: string | null
  last_status: 'pending' | 'success' | 'error' | 'skipped'
  last_error: string | null
  is_active: boolean
  created_at: string
}

interface RepoDetails {
  description: string | null
  stars: number
  watchers: number
  forks: number
  open_issues: number
  default_branch: string
  language: string | null
  size: number
  created_at: string
  updated_at: string
  readme_preview: string | null
  commit_count: number
}

export default function AutomatedRepos() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedRepoForInfo, setSelectedRepoForInfo] = useState<AutomatedRepo | null>(null)
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  const [automatedRepos, setAutomatedRepos] = useState<AutomatedRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [schedule, setSchedule] = useState<'daily' | 'weekly'>('daily')
  const [isGitHubUser, setIsGitHubUser] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [repoToDelete, setRepoToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingRepo, setDeletingRepo] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkGitHubAuth()
    loadAutomatedRepos()
  }, [])

  async function checkGitHubAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if user signed in with GitHub
      const hasGitHubIdentity = user.identities?.some(identity => identity.provider === 'github')
      if (hasGitHubIdentity) {
        setIsGitHubUser(true)
        return
      }

      // Also check if GitHub is connected via Connected Services
      try {
        const res = await fetch('/api/connected-services')
        if (res.ok) {
          const data = await res.json()
          const hasGitHubService = (data.services || []).some(
            (s: { provider: string; status: string }) => s.provider === 'github' && s.status === 'active'
          )
          setIsGitHubUser(hasGitHubService)
        }
      } catch {
        // Ignore — default isGitHubUser is false
      }
    }
  }

  async function loadAutomatedRepos() {
    setLoading(true)
    try {
      // Clean up any expired grace period repos first
      await fetch('/api/automated-repos/grace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
      }).catch(() => {})

      const res = await fetch('/api/automated-repos')
      const data = await res.json()

      if (data.success) {
        setAutomatedRepos(data.automatedRepos || [])
      }
    } catch (error) {
      console.error('Error loading automated repos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadGitHubRepos() {
    setLoadingRepos(true)
    try {
      const res = await fetch('/api/github/repos')
      const data = await res.json()

      if (data.success) {
        setGithubRepos(data.repos || [])
      } else {
        toast.error(data.error || 'Failed to load GitHub repos')
      }
    } catch (error) {
      toast.error('Failed to load GitHub repos')
    } finally {
      setLoadingRepos(false)
    }
  }

  async function activateRepo() {
    if (!selectedRepo) {
      toast.error('Please select a repository')
      return
    }

    const repo = githubRepos.find(r => r.full_name === selectedRepo)
    if (!repo) return

    try {
      const res = await fetch('/api/automated-repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_full_name: repo.full_name,
          repo_url: repo.html_url,
          repo_owner: repo.owner,
          repo_name: repo.name,
          schedule,
          default_branch: repo.default_branch,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(data.message)
        setShowAddModal(false)
        loadAutomatedRepos()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to activate automated proofs')
    }
  }

  function openDeleteModal(id: string, repoName: string) {
    setRepoToDelete({ id, name: repoName })
    setDeleteModalOpen(true)
  }

  async function confirmDeactivateRepo() {
    if (!repoToDelete) return

    setDeletingRepo(true)
    try {
      const res = await fetch(`/api/automated-repos?id=${repoToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        toast.success(data.message)
        loadAutomatedRepos()
        setDeleteModalOpen(false)
        setRepoToDelete(null)
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to deactivate automated proofs')
    } finally {
      setDeletingRepo(false)
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/automated-repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: !currentStatus,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(`Automated proofs ${!currentStatus ? 'resumed' : 'paused'}`)
        loadAutomatedRepos()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to update automated repo')
    }
  }

  async function cycleSchedule(id: string, newSchedule: string) {
    try {
      const res = await fetch('/api/automated-repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, schedule: newSchedule }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Schedule changed to ${newSchedule.charAt(0).toUpperCase() + newSchedule.slice(1)}`)
        loadAutomatedRepos()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to update schedule')
    }
  }

  async function triggerManually(id: string) {
    toast.info('Generating proof...')

    try {
      const res = await fetch('/api/automated-repos/generate-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automated_repo_id: id }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.skipped) {
          toast.info(data.message)
        } else {
          toast.success(data.message)
        }
        loadAutomatedRepos()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Failed to generate proof')
    }
  }

  async function loadRepoDetails(repo: AutomatedRepo) {
    setSelectedRepoForInfo(repo)
    setShowInfoModal(true)
    setLoadingDetails(true)
    setRepoDetails(null)

    try {
      // Fetch detailed repo info from GitHub API
      const res = await fetch(`/api/github/repo-details?owner=${repo.repo_owner}&repo=${repo.repo_name}`)
      const data = await res.json()

      if (data.success) {
        setRepoDetails(data.details)
      } else {
        toast.error(data.error || 'Failed to load repo details')
        console.error('Repo details error:', data.error)
      }
    } catch (error) {
      toast.error('Failed to load repo details')
      console.error('Exception loading repo details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  function getStatusBadge(status: string) {
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

  if (!isGitHubUser) {
    return (
      <div className="bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <Github className="w-6 h-6 text-muted-foreground mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Automated GitHub Proofs</h3>
            <p className="text-muted-foreground">
              Automatically generate proofs from your GitHub repositories on a schedule.
            </p>
          </div>
        </div>
        <p className="text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          Connect your GitHub account to use this feature.{' '}
          <a href="/connected-services" className="underline hover:text-yellow-400">
            Go to Connected Services
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card/30 backdrop-blur-sm border-2 border-primary/30 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Github className="w-6 h-6" />
          Automated GitHub Proofs
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically generate proofs from your GitHub repositories
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : automatedRepos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Github className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No automated repositories configured</p>
          <p className="text-sm mt-1">Click "Add Repository" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automatedRepos.map((repo) => (
            <div
              key={repo.id}
              className="bg-background/50 border border-border rounded-lg p-4 hover:border-primary/50 transition-all"
            >
              {/* Row 1: Repo Name/Profile */}
              <div className="flex items-center gap-2 mb-3">
                <Github className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {repo.repo_full_name}
                </span>
              </div>

              {/* Row 2: Control Bar */}
              <div className="flex items-center justify-center mb-3 bg-background/50 border border-primary/20 rounded-lg overflow-hidden divide-x divide-primary/20">
                <button
                  onClick={() => window.open(repo.repo_url, '_blank')}
                  className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                  title="View on GitHub"
                >
                  <Github className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <button
                  onClick={() => loadRepoDetails(repo)}
                  className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                  title="Repository info"
                >
                  <Info className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </button>
                <button
                  onClick={() => triggerManually(repo.id)}
                  className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                  title="Run now"
                >
                  <Play className="w-4 h-4 text-muted-foreground group-hover:text-green-400 transition-colors fill-current" />
                </button>
                <button
                  onClick={() => toggleActive(repo.id, repo.is_active)}
                  className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                  title={repo.is_active ? 'Pause automation' : 'Resume automation'}
                >
                  {repo.is_active ? (
                    <Pause className="w-4 h-4 text-muted-foreground group-hover:text-yellow-400 transition-colors" />
                  ) : (
                    <Play className="w-4 h-4 text-muted-foreground group-hover:text-green-400 transition-colors fill-current" />
                  )}
                </button>
                <button
                  onClick={() => openDeleteModal(repo.id, repo.repo_full_name)}
                  className="p-2.5 hover:bg-primary/10 transition-colors flex-1 flex items-center justify-center group"
                  title="Delete automation"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Row 3: Status Indicators */}
              <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                {/* Left side */}
                <div className="flex items-center gap-2">
                  <select
                    value={repo.schedule}
                    onChange={(e) => cycleSchedule(repo.id, e.target.value)}
                    className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded font-medium border border-blue-500/20 text-xs cursor-pointer appearance-auto"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  {!repo.is_active && (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded font-medium border border-yellow-500/20">
                      Paused
                    </span>
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {getStatusBadge(repo.last_status)}
                  </div>
                  {repo.last_run_at && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {new Date(repo.last_run_at).toLocaleDateString('en-IE')}
                    </span>
                  )}
                </div>
              </div>

              {/* Error Message (if any) */}
              {repo.last_error && (
                <div className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded p-2">
                  {repo.last_error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Repository Button - Full Width at Bottom */}
      <button
        onClick={() => {
          setShowAddModal(true)
          loadGitHubRepos()
        }}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md"
      >
        <Plus className="w-5 h-5" />
        Add Repository
      </button>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
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
                  Add Automated Repository
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Repository
                    </label>
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choose a repository...</option>
                      {githubRepos.map((repo) => (
                        <option key={repo.id} value={repo.full_name}>
                          {repo.full_name} {repo.private && '(Private)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Schedule
                    </label>
                    <select
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value as 'daily' | 'weekly')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-lg hover:bg-background/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={activateRepo}
                      disabled={!selectedRepo}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Activate
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Info Modal */}
        {showInfoModal && selectedRepoForInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setShowInfoModal(false)}
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
                  Repository Details
                </h3>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : repoDetails ? (
                <div className="space-y-4">
                  {/* Repo Name & Link */}
                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-muted-foreground" />
                    <a
                      href={selectedRepoForInfo.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium flex items-center gap-2"
                    >
                      {selectedRepoForInfo.repo_full_name}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Description */}
                  {repoDetails.description && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-sm text-foreground">{repoDetails.description}</p>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-background/30 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                        <Star className="w-4 h-4" />
                        <span className="font-semibold">{repoDetails.stars}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Stars</p>
                    </div>
                    <div className="p-3 bg-background/30 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                        <GitFork className="w-4 h-4" />
                        <span className="font-semibold">{repoDetails.forks}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Forks</p>
                    </div>
                    <div className="p-3 bg-background/30 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="font-semibold">{repoDetails.watchers}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Watchers</p>
                    </div>
                    <div className="p-3 bg-background/30 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                        <Github className="w-4 h-4" />
                        <span className="font-semibold">{repoDetails.commit_count || '?'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Commits</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {repoDetails.language && (
                      <div>
                        <span className="text-muted-foreground">Language:</span>
                        <span className="ml-2 text-foreground font-medium">{repoDetails.language}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="ml-2 text-foreground font-medium">{repoDetails.default_branch}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 text-foreground font-medium">
                        {(repoDetails.size / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issues:</span>
                      <span className="ml-2 text-foreground font-medium">{repoDetails.open_issues}</span>
                    </div>
                  </div>

                  {/* README Preview */}
                  {repoDetails.readme_preview && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground">README Preview</h4>
                      <div className="p-3 bg-background/50 rounded-lg max-h-48 overflow-y-auto">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                          {repoDetails.readme_preview}...
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>Created: {new Date(repoDetails.created_at).toLocaleDateString('en-IE')}</span>
                    <span>Updated: {new Date(repoDetails.updated_at).toLocaleDateString('en-IE')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Failed to load repository details</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setRepoToDelete(null)
        }}
        onConfirm={confirmDeactivateRepo}
        title="Delete Automation"
        message={`Are you sure you want to delete automated proofs for "${repoToDelete?.name}"? This will stop future automatic backups, but existing proofs will be preserved.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletingRepo}
      />
    </div>
  )
}
