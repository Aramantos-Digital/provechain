'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProveChainBrowserClient } from '@/lib/supabase/provechain-browser'
import { Download, FileText, Calendar, Hash, HardDrive, Shield, Trash2, Info, CheckCircle, X, Check, Edit, GitBranch, Plus, Lightbulb, BookOpen, Search, Tag as TagIcon, Settings, InfoIcon, Lock, Unlock, User, Users, Loader2, Link2, Bot, Monitor, Github, Share2, Copy, Eye, Upload, ExternalLink, Mail, MessageCircle } from 'lucide-react'
import { hasExpiry, getTierDisplayName } from '@/lib/tiers'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { hashFile, generateProofHash } from '@/lib/hasher'
import CountdownTimer from './CountdownTimer'
import ProofDetailsModal, { ProofDetailsData } from './ProofDetailsModal'
import TagManager from './TagManager'
import { ProofFilter, type ProofFilterValue } from './ProofFilter'
import { toast } from 'sonner'
import CustomSelect from './CustomSelect'
import Tooltip from './Tooltip'

interface Proof {
  id: string
  file_name: string
  file_hash: string
  file_size: number | null
  timestamp: string
  proof_json: any
  created_at: string
  expires_at: string | null
  user_id: string
  // Enhanced metadata fields (group-level)
  proof_name: string | null
  description_title: string | null
  description_body: string | null
  official_document_date: string | null
  description: string | null
  // Version-level metadata
  version_notes: string | null
  // Version control fields
  parent_proof_id: string | null
  version_number: number
  proof_group_id: string | null
  root_proof_id: string | null
  // OpenTimestamps
  ots_proof: string | null
  ots_status: string | null
  updated_at: string
  // Connected services / automation
  is_automated: boolean
  automated_repo_id: string | null
  automated_source_id: string | null
  commit_sha: string | null
  repo_url: string | null
  branch_name: string | null
}

interface Subscription {
  id: string
  user_id: string
  tier: 'free' | 'paid'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  canceled_at: string | null
  proofs_expire_at: string | null
  created_at: string
  updated_at: string
}

interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

interface ProofTag {
  proof_id: string
  tag_id: string
  root_proof_id: string
}

interface ProofsListProps {
  userId: string
  initialProofs?: Proof[]
  newProofId?: string
}

interface VerificationResult {
  path: string
  status: 'match' | 'mismatch' | 'missing' | 'extra'
  expectedHash?: string
  actualHash?: string
}

function formatAgeShort(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(seconds / 86400)
  const months = Math.floor(seconds / 2592000)
  const years = Math.floor(seconds / 31536000)
  if (minutes < 1) return 'just now'
  if (hours < 1) return `${minutes} min`
  if (days < 1) return `${hours} hour${hours !== 1 ? 's' : ''}`
  if (months < 1) return `${days} day${days !== 1 ? 's' : ''}`
  if (years < 1) return `${months} month${months !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''}`
}

type ProofSource = 'manual' | 'github' | 'cloud'

function getProofSource(proof: Proof): ProofSource {
  if (proof.automated_repo_id || proof.repo_url) return 'github'
  if (proof.automated_source_id) return 'cloud'
  return 'manual'
}

// Detailed source for per-service filtering
type DetailedProofSource = 'manual' | 'github' | 'onedrive' | 'google_drive' | 'dropbox'

function getDetailedProofSource(proof: Proof): DetailedProofSource {
  if (proof.automated_repo_id || proof.repo_url) return 'github'
  if (proof.automated_source_id) {
    const provider = proof.proof_json?.provider
    if (provider === 'onedrive' || provider === 'google_drive' || provider === 'dropbox') return provider
  }
  return 'manual'
}

const SOURCE_FILTER_CONFIG: Record<DetailedProofSource, { label: string; activeColor: string; inactiveColor: string }> = {
  manual: { label: 'Direct Upload', activeColor: 'bg-purple-500/20 text-purple-400 border-purple-400/50', inactiveColor: 'bg-purple-500/5 text-purple-400/60 border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-400/40' },
  github: { label: 'GitHub', activeColor: 'bg-white/20 text-white border-white/50', inactiveColor: 'bg-white/5 text-slate-400 border-white/15 hover:bg-white/10 hover:text-white hover:border-white/30' },
  onedrive: { label: 'OneDrive', activeColor: 'bg-blue-500/20 text-blue-400 border-blue-400/50', inactiveColor: 'bg-blue-500/5 text-blue-400/60 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-400/40' },
  google_drive: { label: 'Google Drive', activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50', inactiveColor: 'bg-emerald-500/5 text-emerald-400/60 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-400/40' },
  dropbox: { label: 'Dropbox', activeColor: 'bg-sky-500/20 text-sky-400 border-sky-400/50', inactiveColor: 'bg-sky-500/5 text-sky-400/60 border-sky-500/20 hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-400/40' },
}

function SourceFilterIcon({ source, className }: { source: DetailedProofSource; className?: string }) {
  const cn = className || 'w-4 h-4'
  switch (source) {
    case 'manual':
      return <Monitor className={cn} />
    case 'github':
      return <Github className={cn} />
    case 'onedrive':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.453 9.95q.961.058 1.787.468.826.41 1.442 1.066.615.657.966 1.512.352.856.352 1.816 0 1.008-.387 1.893-.386.885-1.049 1.547-.662.662-1.546 1.049-.885.387-1.893.387H6q-1.242 0-2.332-.475-1.09-.475-1.904-1.29-.815-.814-1.29-1.903Q0 14.93 0 13.688q0-.985.31-1.887.311-.903.862-1.658.55-.756 1.324-1.325.774-.568 1.711-.861.434-.129.85-.187.416-.06.861-.082h.012q.515-.786 1.207-1.413.691-.627 1.5-1.066.808-.44 1.705-.668.896-.229 1.845-.229 1.278 0 2.456.417 1.177.416 2.144 1.16.967.744 1.658 1.78.692 1.038 1.008 2.28zm-7.265-4.137q-1.325 0-2.52.544-1.195.545-2.04 1.565.446.117.85.299.405.181.792.416l4.78 2.86 2.731-1.15q.27-.117.545-.204.276-.088.58-.147-.293-.937-.855-1.705-.563-.768-1.319-1.318-.755-.551-1.658-.856-.902-.304-1.886-.304zM2.414 16.395l9.914-4.184-3.832-2.297q-.586-.351-1.23-.539-.645-.188-1.325-.188-.914 0-1.722.364-.809.363-1.412.978-.604.616-.955 1.436-.352.82-.352 1.723 0 .703.234 1.423.235.721.68 1.284zm16.711 1.793q.563 0 1.078-.176.516-.176.961-.516l-7.23-4.324-10.301 4.336q.527.328 1.13.504.604.175 1.237.175zm3.012-1.852q.363-.727.363-1.523 0-.774-.293-1.407t-.791-1.072q-.498-.44-1.166-.68-.668-.24-1.406-.24-.422 0-.838.1t-.815.252q-.398.152-.785.334-.386.181-.761.345Z" />
        </svg>
      )
    case 'google_drive':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" />
        </svg>
      )
    case 'dropbox':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z" />
        </svg>
      )
  }
}

function ProofSourceIcon({ proof, className }: { proof: Proof; className?: string }) {
  const cn = className || 'h-5 w-5 text-primary flex-shrink-0'
  const detailed = getDetailedProofSource(proof)
  if (detailed) return <SourceFilterIcon source={detailed} className={cn} />
  const source = getProofSource(proof)
  if (source === 'github') return <Github className={cn} />
  return <Monitor className={cn} />
}

function computeRootProofIds(rows: Proof[]): Proof[] {
  return rows.map(proof => {
    let root_id = proof.id
    if (proof.proof_group_id) {
      const groupProofs = rows.filter(p => p.proof_group_id === proof.proof_group_id)
      const root = groupProofs.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0]
      if (root) root_id = root.id
    } else {
      let current = proof
      const visited = new Set<string>()
      while (current.parent_proof_id && !visited.has(current.id)) {
        visited.add(current.id)
        const parent = rows.find(p => p.id === current.parent_proof_id)
        if (parent) { root_id = parent.id; current = parent } else break
      }
    }
    return { ...proof, root_proof_id: root_id }
  })
}

export default function ProofsList({ userId, initialProofs, newProofId }: ProofsListProps) {
  const router = useRouter()
  const hasInitialData = initialProofs !== undefined
  const [proofs, setProofs] = useState<Proof[]>(() =>
    hasInitialData ? computeRootProofIds(initialProofs) : []
  )
  const [loading, setLoading] = useState(!hasInitialData)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [serverStorage, setServerStorage] = useState<number | null>(null)
  const [openInfoTooltip, setOpenInfoTooltip] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean
    step: 1 | 2
    proofId: string | null
    deleteAllVersions: boolean
  }>({
    show: false,
    step: 1,
    proofId: null,
    deleteAllVersions: false,
  })
  const [infoModal, setInfoModal] = useState<{ show: boolean; proof: Proof | null }>({
    show: false,
    proof: null,
  })
  const [verifyModal, setVerifyModal] = useState<{
    show: boolean
    proof: Proof | null
    isVerifying: boolean
    results: VerificationResult[] | null
    progress: { current: number; total: number } | null
  }>({
    show: false,
    proof: null,
    isVerifying: false,
    results: null,
    progress: null,
  })
  const [showVerifyPrivacyModal, setShowVerifyPrivacyModal] = useState(false)
  const [pendingVerifyProof, setPendingVerifyProof] = useState<Proof | null>(null)
  const [editModal, setEditModal] = useState<{ show: boolean; proof: Proof | null }>({
    show: false,
    proof: null,
  })
  const [showEducationModal, setShowEducationModal] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({}) // Maps groupKey (proof_name or file_name) to selected proof id
  const [editMode, setEditMode] = useState(false)
  const [showEditModeWarning, setShowEditModeWarning] = useState(false)
  const [editModeTab, setEditModeTab] = useState<'move' | 'copy' | 'combine'>('combine')
  const [selectedProofIds, setSelectedProofIds] = useState<Set<string>>(new Set())
  const [showCombineModal, setShowCombineModal] = useState(false)
  const [combineData, setCombineData] = useState<{ proofIds: string[]; proofs: Proof[] } | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [moveDestination, setMoveDestination] = useState<{ type: 'personal' | 'team'; teamId?: string; teamName?: string } | null>(null)
  const [copyDestination, setCopyDestination] = useState<{ type: 'personal' | 'team'; teamId?: string; teamName?: string } | null>(null)
  const [availableTeams, setAvailableTeams] = useState<Array<{ team_id: string; team_name: string; team_tier: string; user_role: string }>>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [moveVersionOption, setMoveVersionOption] = useState<'latest' | 'all'>('latest')
  const [copyVersionOption, setCopyVersionOption] = useState<'latest' | 'all'>('latest')
  const [movingProofs, setMovingProofs] = useState(false)
  const [copyingProofs, setCopyingProofs] = useState(false)
  const [tagsLocked, setTagsLocked] = useState<Record<string, boolean>>({}) // Lock tags by default per proof group
  const [versionNotesModal, setVersionNotesModal] = useState<{
    show: boolean
    proof: Proof | null
    versionNotes: string
  }>({
    show: false,
    proof: null,
    versionNotes: '',
  })
  const [combining, setCombining] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shareModal, setShareModal] = useState<{
    show: boolean
    proof: Proof | null
    mode: 'view' | 'file'
    shareUrl: string | null
    loading: boolean
  }>({ show: false, proof: null, mode: 'file', shareUrl: null, loading: false })
  const [searchQuery, setSearchQuery] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [proofTags, setProofTags] = useState<ProofTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [showTagManager, setShowTagManager] = useState(false)
  const [proofFilter, setProofFilter] = useState<ProofFilterValue>({ type: 'personal' })
  const [sourceFilters, setSourceFilters] = useState<Set<DetailedProofSource>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const dataClient = createProveChainBrowserClient()

  useEffect(() => {
    fetchSubscription()
    fetchServerStorage()
    fetchTags()
    fetchProofTags()

    // Set up polling for storage stats (every 30 seconds)
    const storagePollingInterval = setInterval(() => {
      fetchServerStorage()
    }, 30000); // 30 seconds

    return () => {
      clearInterval(storagePollingInterval)
    }
  }, [])

  // Re-fetch proofs when filter changes (also handles initial load)
  const fetchAbortRef = useRef<AbortController | null>(null)
  const skipInitialFetch = useRef(hasInitialData)
  useEffect(() => {
    // Skip the first fetch if server pre-fetched personal proofs
    if (skipInitialFetch.current && proofFilter.type === 'personal') {
      skipInitialFetch.current = false
      return
    }
    skipInitialFetch.current = false
    // Abort any in-flight request so stale data doesn't overwrite
    if (fetchAbortRef.current) fetchAbortRef.current.abort()
    fetchAbortRef.current = new AbortController()
    setLoading(true)
    setSourceFilters(new Set()) // Reset service filters when switching views
    fetchProofs(proofFilter, fetchAbortRef.current.signal)
    // Save filter to localStorage for create page to use
    localStorage.setItem('provechain_last_proof_filter', JSON.stringify(proofFilter))
  }, [proofFilter])

  // If redirected from create page with a new proof ID, poll until it appears
  useEffect(() => {
    if (!newProofId || proofFilter.type !== 'personal') return
    if (proofs.some(p => p.id === newProofId)) return // Already visible

    setLoading(true)
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(async () => {
      attempts++
      const { data } = await dataClient.from('proofs').select('*').eq('user_id', userId).is('team_id', null).order('created_at', { ascending: false })
      if (data) {
        const found = data.some((p: any) => p.id === newProofId)
        if (found || attempts >= maxAttempts) {
          setProofs(computeRootProofIds(data))
          setLoading(false)
          clearInterval(interval)
        }
      }
      if (attempts >= maxAttempts) {
        setLoading(false)
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [newProofId])

  // Click outside handler for info tooltips
  useEffect(() => {
    if (!openInfoTooltip) return

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      // Check if click is outside tooltip and not on an info icon
      if (!target.closest('.info-tooltip-container')) {
        setOpenInfoTooltip(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openInfoTooltip])

  // Show education modal for first-time users
  useEffect(() => {
    if (proofs.length > 0) {
      const hasSeenEducation = localStorage.getItem('provechain_seen_version_education')
      if (!hasSeenEducation) {
        setShowEducationModal(true)
      }
    }
  }, [proofs])

  const fetchServerStorage = async () => {
    try {
      const { data, error } = await dataClient
        .from('usage_stats')
        .select('*')
        .single()
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching storage:', error)
        return
      }
      setServerStorage(data?.total_storage_bytes || 0)
    } catch (error) {
      console.error('Error fetching server storage:', error)
    }
  }

  const fetchProofs = async (filter = proofFilter, signal?: AbortSignal) => {
    try {
      let query = dataClient.from('proofs').select('*')

      if (filter.type === 'team' && filter.teamId) {
        query = query.eq('team_id', filter.teamId)
      } else {
        query = query.is('team_id', null)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (signal?.aborted) return
      if (error) throw new Error(error.message)

      const rows: any[] = data || []
      setProofs(computeRootProofIds(rows))
      // Update storage whenever proofs are refetched
      await fetchServerStorage()
    } catch (error: any) {
      if (signal?.aborted) return
      console.error('Error fetching proofs:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription')
      const data = await response.json()

      if (data.success) {
        setSubscription(data.subscription)
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const { data, error } = await dataClient
        .from('tags')
        .select('*')
        .order('name')
      if (!error) setTags(data || [])
    } catch (error: any) {
      console.error('Error fetching tags:', error)
    }
  }

  const fetchProofTags = async () => {
    try {
      const { data, error } = await dataClient
        .from('proof_tags')
        .select('*')
      if (!error) setProofTags(data || [])
    } catch (error: any) {
      console.error('Error fetching proof tags:', error)
    }
  }

  // Optimistic tag operations — update UI immediately, sync with server in background
  const addTagToProof = async (proofId: string, tagId: string, rootProofId: string | null) => {
    const effectiveRootId = rootProofId || proofId
    const optimisticTag: ProofTag = { proof_id: proofId, tag_id: tagId, root_proof_id: effectiveRootId }
    setProofTags(prev => [...prev, optimisticTag])

    try {
      const response = await fetch('/api/proof-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_id: proofId, tag_id: tagId }),
      })
      if (!response.ok) {
        setProofTags(prev => prev.filter(pt => !(pt.proof_id === proofId && pt.tag_id === tagId)))
      }
    } catch (err) {
      console.error('Error adding tag:', err)
      setProofTags(prev => prev.filter(pt => !(pt.proof_id === proofId && pt.tag_id === tagId)))
    }
  }

  const removeTagFromProof = async (proofId: string, tagId: string, rootProofId: string | null) => {
    const effectiveRootId = rootProofId || proofId
    const previousTags = proofTags
    setProofTags(prev => prev.filter(pt => !(pt.root_proof_id === effectiveRootId && pt.tag_id === tagId)))

    try {
      const response = await fetch(`/api/proof-tags?proof_id=${proofId}&tag_id=${tagId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        setProofTags(previousTags)
      }
    } catch (err) {
      console.error('Error removing tag:', err)
      setProofTags(previousTags)
    }
  }

  // Helper function to get root proof metadata (group-level metadata)
  const getRootProofMetadata = (proof: Proof) => {
    const rootProof = proofs.find(p => p.id === proof.root_proof_id)
    return rootProof || proof // Fallback to current proof if root not found
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }

    return `${hours}h ${minutes}m`
  }

  const downloadProof = (proof: Proof) => {
    const blob = new Blob([JSON.stringify(proof.proof_json, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${proof.file_name}.proof.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // Load available teams for move/copy operations
  const loadAvailableTeams = async () => {
    setLoadingTeams(true)
    try {
      const { data, error } = await dataClient
        .rpc('get_user_team_options', { p_user_id: userId })
      if (error) return

      const sortedTeams = (data || []).sort((a: any, b: any) =>
        a.team_name.localeCompare(b.team_name)
      )

      setAvailableTeams(sortedTeams)
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  // Handle move operation
  const handleMoveProofs = async () => {
    if (!moveDestination || selectedProofIds.size === 0) return

    setMovingProofs(true)
    try {
      const selectedProofs = activeProofs.filter(p => selectedProofIds.has(p.id))

      // Permission check: members cannot move proofs OUT of teams
      if (proofFilter.type === 'team' && proofFilter.teamId) {
        // User is trying to move FROM a team
        const team = availableTeams.find(t => t.team_id === proofFilter.teamId)
        if (team && team.user_role === 'member') {
          // Members can only move to the same team (no-op) - they can't move OUT
          if (moveDestination.type === 'personal' || moveDestination.teamId !== proofFilter.teamId) {
            setError('Team members cannot move proofs out of the team. Only admins can.')
            setMovingProofs(false)
            return
          }
        }
      }

      // For each selected proof, determine which proofs to move
      const proofsToMove: string[] = []

      if (moveVersionOption === 'all') {
        // Move all versions in the proof groups
        selectedProofs.forEach(proof => {
          const groupKey = proof.proof_group_id || (proof.parent_proof_id ? (proof.proof_name || proof.file_name) : proof.id)
          const versions = proofGroups[groupKey] || []
          versions.forEach(v => {
            if (!proofsToMove.includes(v.id)) {
              proofsToMove.push(v.id)
            }
          })
        })
      } else {
        // Move only selected proofs (latest)
        proofsToMove.push(...Array.from(selectedProofIds))
      }

      // Call API to move proofs
      const response = await fetch('/api/proofs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_ids: proofsToMove,
          destination: moveDestination,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to move proofs')
      }

      // Refresh proofs list
      await fetchProofs()
      setShowMoveModal(false)
      setMoveDestination(null)
      setEditMode(false)
      setSelectedProofIds(new Set())
      setMoveVersionOption('latest')
    } catch (error: any) {
      console.error('Error moving proofs:', error)
      setError(error.message)
    } finally {
      setMovingProofs(false)
    }
  }

  // Handle copy operation
  const handleCopyProofs = async () => {
    if (!copyDestination || selectedProofIds.size === 0) return

    setCopyingProofs(true)
    try {
      const selectedProofs = activeProofs.filter(p => selectedProofIds.has(p.id))

      // For each selected proof, determine which proofs to copy
      const proofsToCopy: string[] = []

      if (copyVersionOption === 'all') {
        // Copy all versions in the proof groups
        selectedProofs.forEach(proof => {
          const groupKey = proof.proof_group_id || (proof.parent_proof_id ? (proof.proof_name || proof.file_name) : proof.id)
          const versions = proofGroups[groupKey] || []
          versions.forEach(v => {
            if (!proofsToCopy.includes(v.id)) {
              proofsToCopy.push(v.id)
            }
          })
        })
      } else {
        // Copy only selected proofs (latest)
        proofsToCopy.push(...Array.from(selectedProofIds))
      }

      // Call API to copy proofs
      const response = await fetch('/api/proofs/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof_ids: proofsToCopy,
          destination: copyDestination,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to copy proofs')
      }

      // Refresh proofs list
      await fetchProofs()
      setShowCopyModal(false)
      setCopyDestination(null)
      setEditMode(false)
      setSelectedProofIds(new Set())
      setCopyVersionOption('latest')
    } catch (error: any) {
      console.error('Error copying proofs:', error)
      setError(error.message)
    } finally {
      setCopyingProofs(false)
    }
  }

  // Filter out expired proofs client-side and group by file_hash
  const { activeProofs, proofGroups, displayProofs, totalStorage, groupEarliestExpiry } = useMemo(() => {
    const active = proofs.filter(proof => {
      if (!proof.expires_at) return true
      return new Date(proof.expires_at).getTime() > Date.now()
    })

    // Group proofs by proof_group_id (if exists) or proof_name
    // This allows version control to work even when file contents change
    // proof_group_id is used when proofs are manually combined via Edit Mode
    const groups: Record<string, Proof[]> = {}
    active.forEach(proof => {
      // For standalone proofs (no parent, no group), use their ID to prevent grouping
      // Only group proofs that are explicitly connected (via parent or group ID)
      let groupKey: string
      if (proof.proof_group_id) {
        // Explicitly grouped (via Edit Mode combine)
        groupKey = proof.proof_group_id
      } else if (proof.parent_proof_id) {
        // Part of a version chain - group by root_proof_id (stable across all versions)
        groupKey = proof.root_proof_id || proof.id
      } else {
        // Standalone proof (no parent, no group) - keep separate even if it has a proof_name
        // This ensures "Save Separately" proofs don't accidentally group together
        groupKey = proof.id
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(proof)
    })

    // Sort versions within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.version_number - a.version_number) // Latest first
    })

    // Calculate earliest expires_at for each group (for free tier timer abuse prevention)
    const groupEarliestExpiry: Record<string, string | null> = {}
    Object.keys(groups).forEach(key => {
      const versionsWithExpiry = groups[key].filter(p => p.expires_at)
      if (versionsWithExpiry.length > 0) {
        const earliest = versionsWithExpiry.reduce((min, proof) => {
          const proofTime = new Date(proof.expires_at!).getTime()
          const minTime = new Date(min).getTime()
          return proofTime < minTime ? proof.expires_at! : min
        }, versionsWithExpiry[0].expires_at!)
        groupEarliestExpiry[key] = earliest
      } else {
        groupEarliestExpiry[key] = null
      }
    })

    // Get proofs to display (one per group, based on selected version)
    const display = Object.keys(groups).map(groupKey => {
      const versions = groups[groupKey]
      const selectedId = selectedVersions[groupKey]
      const selected = versions.find(v => v.id === selectedId)
      return selected || versions[0] // Default to latest if no selection
    })

    // Calculate actual proof storage (size of JSON data we store, not user's file size)
    // Count ALL versions, not just the displayed ones
    const storage = active.reduce((acc, proof) => {
      // Calculate byte size of the proof_json we actually store
      const jsonSize = proof.proof_json
        ? new Blob([JSON.stringify(proof.proof_json)]).size
        : 0
      return acc + jsonSize
    }, 0)

    return { activeProofs: active, proofGroups: groups, displayProofs: display, totalStorage: storage, groupEarliestExpiry }
  }, [proofs, selectedVersions])

  // Derive which connected services have proofs in the current view
  const availableSources = useMemo(() => {
    const sources = new Set<DetailedProofSource>()
    for (const proof of activeProofs) {
      const source = getDetailedProofSource(proof)
      if (source) sources.add(source)
    }
    return sources
  }, [activeProofs])

  const toggleSourceFilter = (source: DetailedProofSource) => {
    setSourceFilters(prev => {
      const next = new Set(prev)
      if (next.has(source)) next.delete(source)
      else next.add(source)
      return next
    })
  }

  // Filter displayed proofs based on search query, selected tags, and source filters
  const filteredProofs = useMemo(() => {
    let filtered = displayProofs

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(proof => {
        const rootMetadata = getRootProofMetadata(proof)
        const searchableFields = [
          rootMetadata.proof_name,
          proof.file_name,
          rootMetadata.description_title,
          rootMetadata.description_body,
        ].filter(Boolean)

        return searchableFields.some(field =>
          field?.toLowerCase().includes(query)
        )
      })
    }

    // Filter by selected tags (AND logic - proof must have all selected tags)
    if (selectedTagIds.size > 0) {
      filtered = filtered.filter(proof => {
        const proofTagIds = proofTags
          .filter(pt => pt.root_proof_id === proof.root_proof_id)
          .map(pt => pt.tag_id)

        // Check if proof has all selected tags
        return Array.from(selectedTagIds).every(tagId =>
          proofTagIds.includes(tagId)
        )
      })
    }

    // Filter by connected service source toggles
    if (sourceFilters.size > 0) {
      filtered = filtered.filter(proof => {
        const source = getDetailedProofSource(proof)
        return sourceFilters.has(source)
      })
    }

    return filtered
  }, [displayProofs, searchQuery, selectedTagIds, proofTags, sourceFilters])

  const initiateShare = (proof: Proof) => {
    const source = getProofSource(proof)
    if (source === 'github' || source === 'cloud') {
      // Connected service — skip mode picker, create view-only link immediately
      setShareModal({ show: true, proof, mode: 'view', shareUrl: null, loading: true })
      createShareLinkForProof(proof, 'view')
    } else {
      // Manual — show mode picker
      setShareModal({ show: true, proof, mode: 'file', shareUrl: null, loading: false })
    }
  }

  const createShareLinkForProof = async (proof: Proof, mode: 'view' | 'file') => {
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof_id: proof.id, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create share link')

      setShareModal(prev => ({ ...prev, shareUrl: data.share_url, loading: false }))
    } catch (error: any) {
      toast.error(error.message)
      setShareModal(prev => ({ ...prev, loading: false }))
    }
  }

  const createShareLink = async () => {
    if (!shareModal.proof) return
    setShareModal(prev => ({ ...prev, loading: true }))
    await createShareLinkForProof(shareModal.proof, shareModal.mode)
  }

  const copyShareUrl = async () => {
    if (!shareModal.shareUrl) return
    try {
      await navigator.clipboard.writeText(shareModal.shareUrl)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const getShareText = (proofName: string) => {
    return `I've shared a verified proof with you: "${proofName}". Click to verify:`
  }

  const initiateDelete = (proofId: string) => {
    setDeleteModal({ show: true, step: 1, proofId, deleteAllVersions: false })
  }

  const proceedToStep2 = (deleteAll: boolean = false) => {
    setDeleteModal(prev => ({ ...prev, step: 2, deleteAllVersions: deleteAll }))
  }

  const cancelDelete = () => {
    setDeleteModal({ show: false, step: 1, proofId: null, deleteAllVersions: false })
  }

  const confirmDelete = async () => {
    if (!deleteModal.proofId) return

    setError(null) // Clear any previous errors
    setDeleting(true)
    try {
      if (deleteModal.deleteAllVersions) {
        // Find the proof to get its proof_name or proof_group_id
        const targetProof = proofs.find(p => p.id === deleteModal.proofId)
        if (!targetProof) throw new Error('Proof not found')

        // Get all proof IDs that will be deleted
        let proofsToDelete: Proof[]
        if (targetProof.proof_group_id) {
          proofsToDelete = proofs.filter(p => p.proof_group_id === targetProof.proof_group_id)
        } else {
          const proofName = targetProof.proof_name || targetProof.file_name
          proofsToDelete = proofs.filter(p => (p.proof_name || p.file_name) === proofName)
        }

        const proofIds = proofsToDelete.map(p => p.id)
        const rootProofId = targetProof.root_proof_id || targetProof.id

        // STEP 1: Delete proof_tags for the entire proof group to avoid trigger conflicts
        // Delete by root_proof_id to catch all tags in the version group
        for (const proof of proofsToDelete) {
          try {
            await fetch(`/api/proof-tags?proof_id=${proof.id}&tag_id=all`, { method: 'DELETE' })
          } catch (tagErr) {
            console.error('Error deleting proof tags:', tagErr)
            // Continue anyway - tags might not exist
          }
        }

        // STEP 2: Delete proofs ONE AT A TIME to avoid trigger conflicts
        // Sort by version_number descending (delete newest first) to avoid trigger issues
        const sortedProofs = proofsToDelete.sort((a, b) => (b.version_number || 0) - (a.version_number || 0))

        for (const proof of sortedProofs) {
          const delRes = await fetch(`/api/proofs/${proof.id}`, { method: 'DELETE' })

          if (!delRes.ok) {
            console.error(`Error deleting proof ${proof.id}`)
            throw new Error('Failed to delete proof')
          }
        }

        // Remove all versions from local state
        if (targetProof.proof_group_id) {
          setProofs(proofs.filter(p => p.proof_group_id !== targetProof.proof_group_id))
        } else {
          const proofName = targetProof.proof_name || targetProof.file_name
          setProofs(proofs.filter(p => (p.proof_name || p.file_name) !== proofName))
        }
      } else {
        // Delete only this specific version

        // STEP 1: Delete proof_tags first
        try {
          await fetch(`/api/proof-tags?proof_id=${deleteModal.proofId}&tag_id=all`, { method: 'DELETE' })
        } catch (tagErr) {
          console.error('Error deleting proof tags:', tagErr)
          // Continue anyway
        }

        // STEP 2: Delete the proof
        const delRes = await fetch(`/api/proofs/${deleteModal.proofId}`, { method: 'DELETE' })
        if (!delRes.ok) throw new Error('Failed to delete proof')

        // Remove from local state
        setProofs(proofs.filter(p => p.id !== deleteModal.proofId))
      }

      setDeleteModal({ show: false, step: 1, proofId: null, deleteAllVersions: false })
      // Refresh proof tags after deletion
      await fetchProofTags()
    } catch (error: any) {
      console.error('Error deleting proof:', error)
      setError(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const initiateVerify = (proof: Proof) => {
    const source = getProofSource(proof)
    if (source === 'github' || source === 'cloud') {
      // Connected service proofs don't process local files — skip privacy modal
      setVerifyModal({ show: true, proof, isVerifying: true, results: null, progress: null })
      autoVerifyConnectedProof(proof)
    } else {
      // Manual proofs need file upload — show privacy modal first
      setPendingVerifyProof(proof)
      setShowVerifyPrivacyModal(true)
    }
  }

  const confirmVerifyPrivacyAndProceed = () => {
    setShowVerifyPrivacyModal(false)
    if (pendingVerifyProof) {
      const source = getProofSource(pendingVerifyProof)
      if (source === 'github' || source === 'cloud') {
        // Connected service proofs auto-verify — no file upload needed
        setVerifyModal({ show: true, proof: pendingVerifyProof, isVerifying: true, results: null, progress: null })
        setPendingVerifyProof(null)
        autoVerifyConnectedProof(pendingVerifyProof)
      } else {
        setVerifyModal({ show: true, proof: pendingVerifyProof, isVerifying: false, results: null, progress: null })
        setPendingVerifyProof(null)
      }
    }
  }

  const autoVerifyConnectedProof = async (proof: Proof) => {
    const MIN_DURATION = 2000 // Minimum 2 seconds for visual feedback

    try {
      // GitHub proofs store files as an array: { path, hash, size }[]
      // Manual/cloud proofs store file_hashes as Record<string, string>
      const proofJson = proof.proof_json || {}
      let fileEntries: { path: string; hash: string }[] = []

      if (Array.isArray(proofJson.files)) {
        // GitHub proof format
        fileEntries = proofJson.files.map((f: { path: string; hash: string }) => ({ path: f.path, hash: f.hash }))
      } else if (proofJson.file_hashes) {
        // Manual/cloud proof format
        fileEntries = Object.entries(proofJson.file_hashes).map(([path, hash]) => ({ path, hash: hash as string }))
      }

      const total = fileEntries.length

      // Set initial progress
      setVerifyModal(prev => ({ ...prev, progress: { current: 0, total } }))

      const results: VerificationResult[] = []

      // Recompute canonical hash from stored file entries
      const hashEntries = fileEntries.map(f => ({
        path: f.path.replace(/\\/g, '/'),
        hash: f.hash,
        size: 0,
      }))
      const recomputedHash = await generateProofHash(hashEntries)

      // Build all results
      for (const f of fileEntries) {
        if (recomputedHash === proof.file_hash) {
          results.push({ path: f.path, status: 'match', expectedHash: f.hash, actualHash: f.hash })
        } else {
          results.push({ path: f.path, status: 'mismatch', expectedHash: f.hash })
        }
      }

      // Animate progress in ~40 visual steps over the minimum duration
      const steps = Math.min(total, 40)
      const stepDelay = MIN_DURATION / steps
      for (let i = 1; i <= steps; i++) {
        const current = Math.round((i / steps) * total)
        setVerifyModal(prev => ({ ...prev, progress: { current, total } }))
        await new Promise(resolve => setTimeout(resolve, stepDelay))
      }

      setVerifyModal(prev => ({ ...prev, isVerifying: false, results }))

      // Log verification
      const verificationPassed = recomputedHash === proof.file_hash
      try {
        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: verificationPassed ? 'verification_passed' : 'verification_failed',
            resource_type: 'proof',
            resource_id: proof.id,
            details: {
              proof_name: proof.proof_name || proof.file_name,
              verification_status: verificationPassed ? 'passed' : 'failed',
              verification_type: 'connected_service',
              source: getProofSource(proof),
              match_count: verificationPassed ? fileEntries.length : 0,
              mismatch_count: verificationPassed ? 0 : fileEntries.length,
              total_files: fileEntries.length,
            }
          })
        })
      } catch (logError) {
        console.error('Error logging verification:', logError)
      }
    } catch (error) {
      console.error('Auto-verify error:', error)
      setVerifyModal(prev => ({ ...prev, isVerifying: false }))
    }
  }

  const cancelVerifyPrivacy = () => {
    setShowVerifyPrivacyModal(false)
    setPendingVerifyProof(null)
  }

  const initiateNewVersion = (proof: Proof) => {
    setVersionNotesModal({ show: true, proof, versionNotes: '' })
  }

  const confirmNewVersion = () => {
    if (!versionNotesModal.proof) return

    const proof = versionNotesModal.proof
    const versionNotes = versionNotesModal.versionNotes.trim()

    // Button is disabled if no version notes, so this should never happen
    if (!versionNotes) return

    const proofName = getRootProofMetadata(proof).proof_name || proof.file_name

    // Navigate to create page with version notes
    router.push(
      `/create?versionOf=${proof.id}&proofName=${encodeURIComponent(proofName)}&versionNotes=${encodeURIComponent(versionNotes)}`
    )

    // Close modal
    setVersionNotesModal({ show: false, proof: null, versionNotes: '' })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !verifyModal.proof) return

    setVerifyModal(prev => ({ ...prev, isVerifying: true }))

    try {
      const results: VerificationResult[] = []
      const expectedHashes = verifyModal.proof.proof_json.file_hashes || {}
      const actualHashes: Record<string, string> = {}

      // Hash all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = file.webkitRelativePath || file.name
        const normalizedPath = path.replace(/\\/g, '/')
        const hash = await hashFile(file)
        actualHashes[normalizedPath] = hash
      }

      // Check each expected file
      for (const [expectedPath, expectedHash] of Object.entries(expectedHashes)) {
        if (actualHashes[expectedPath]) {
          if (actualHashes[expectedPath] === expectedHash) {
            results.push({
              path: expectedPath,
              status: 'match',
              expectedHash: expectedHash as string,
              actualHash: actualHashes[expectedPath],
            })
          } else {
            results.push({
              path: expectedPath,
              status: 'mismatch',
              expectedHash: expectedHash as string,
              actualHash: actualHashes[expectedPath],
            })
          }
        } else {
          results.push({
            path: expectedPath,
            status: 'missing',
            expectedHash: expectedHash as string,
          })
        }
      }

      // Check for extra files not in proof
      for (const [actualPath, actualHash] of Object.entries(actualHashes)) {
        if (!expectedHashes[actualPath]) {
          results.push({
            path: actualPath,
            status: 'extra',
            actualHash,
          })
        }
      }

      setVerifyModal(prev => ({ ...prev, isVerifying: false, results }))

      // Log verification to changelog
      try {
        const matchCount = results.filter(r => r.status === 'match').length
        const mismatchCount = results.filter(r => r.status === 'mismatch').length
        const missingCount = results.filter(r => r.status === 'missing').length
        const extraCount = results.filter(r => r.status === 'extra').length

        // Determine pass/fail: passes only if all files match and no mismatches/missing
        const verificationPassed = matchCount === results.length && mismatchCount === 0 && missingCount === 0
        const verificationStatus = verificationPassed ? 'passed' : 'failed'

        await fetch('/api/audit-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: verificationPassed ? 'verification_passed' : 'verification_failed',
            resource_type: 'proof',
            resource_id: verifyModal.proof.id,
            details: {
              proof_name: verifyModal.proof.proof_name || verifyModal.proof.file_name,
              verification_status: verificationStatus,
              match_count: matchCount,
              mismatch_count: mismatchCount,
              missing_count: missingCount,
              extra_count: extraCount,
              total_files: results.length
            }
          })
        })
      } catch (logError) {
        console.error('Error logging verification:', logError)
        // Don't fail verification if logging fails
      }
    } catch (error: any) {
      console.error('Error verifying files:', error)
      setError(error.message)
      setVerifyModal(prev => ({ ...prev, isVerifying: false }))
    }

    // Reset file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
  }

  const closeVerifyModal = () => {
    setVerifyModal({ show: false, proof: null, isVerifying: false, results: null, progress: null })
    // Reset file inputs when closing modal
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
  }

  const initiateEdit = (proof: Proof) => {
    setEditModal({ show: true, proof })
  }

  const handleSaveDetails = async (details: ProofDetailsData) => {
    if (!editModal.proof) return

    try {
      // Get the root proof ID for this proof group
      const rootProofId = editModal.proof.root_proof_id || editModal.proof.id

      // Update the root proof (group-level metadata)
      const response = await fetch(`/api/proofs/${rootProofId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update proof details')
      }

      // Update local state for ALL versions in the group (they all show root metadata)
      setProofs(proofs.map(p =>
        p.root_proof_id === rootProofId || p.id === rootProofId
          ? { ...p, ...details }
          : p
      ))

      setEditModal({ show: false, proof: null })
    } catch (error: any) {
      console.error('Error updating proof:', error)
      setError(error.message)
    }
  }

  const renderDeleteModal = () => {
    if (!deleteModal.show) return null

    const targetProof = proofs.find(p => p.id === deleteModal.proofId)
    if (!targetProof) return null

    // Use same grouping logic as main display (priority: proof_group_id > root_proof_id > id)
    const groupKey = targetProof.proof_group_id || (targetProof.parent_proof_id ? (targetProof.root_proof_id || targetProof.id) : targetProof.id)
    const versions = proofGroups[groupKey] || []
    const hasMultipleVersions = versions.length > 1

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-card border-2 border-border rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md shadow-2xl">
          {deleteModal.step === 1 ? (
            <>
              <h3 className="text-xl font-bold mb-4 text-foreground">Delete Proof?</h3>
              {hasMultipleVersions ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    This proof has {versions.length} versions. What would you like to delete?
                  </p>
                  <div className="bg-accent/30 border border-border rounded-lg p-3 mb-6">
                    <p className="text-xs text-muted-foreground mb-1">Current version:</p>
                    <p className="font-medium text-sm">v{targetProof.version_number} - {new Date(targetProof.created_at).toLocaleDateString('en-IE')}</p>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    <button
                      onClick={() => proceedToStep2(false)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-foreground transition-colors text-left"
                    >
                      <p className="font-medium">Delete only v{targetProof.version_number}</p>
                      <p className="text-xs text-muted-foreground mt-1">Keep other versions</p>
                    </button>
                    <button
                      onClick={() => proceedToStep2(true)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-foreground transition-colors text-left"
                    >
                      <p className="font-medium">Delete all {versions.length} versions</p>
                      <p className="text-xs text-muted-foreground mt-1">Permanently remove all versions of this proof</p>
                    </button>
                  </div>
                  <button
                    onClick={cancelDelete}
                    className="w-full px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete this proof? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelDelete}
                      className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => proceedToStep2(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4 text-red-500">Final Warning!</h3>
              <p className="text-foreground mb-4 font-medium">
                {deleteModal.deleteAllVersions
                  ? `If you delete all ${versions.length} versions, there's no getting them back.`
                  : "If you delete this version, there's no getting it back."}
              </p>
              <p className="text-muted-foreground mb-6 text-sm">
                You can always re-hash the files, but it will have a new timestamp and proof ID.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : deleteModal.deleteAllVersions ? 'Delete All Forever' : 'Delete Forever'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg">
        <p className="font-medium">Error loading proofs</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {renderDeleteModal()}

      {/* Info Modal */}
      {infoModal.show && infoModal.proof && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Proof Details
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Proof Metadata */}
              <div className="space-y-3">
                {/* Row 1: File Name and File Size */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Proof Name</p>
                    </div>
                    <p className="font-semibold text-foreground">{getRootProofMetadata(infoModal.proof).proof_name || infoModal.proof.file_name}</p>
                  </div>

                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-5 w-5 text-blue-400" />
                      <p className="text-sm text-muted-foreground">Proof Size</p>
                    </div>
                    <p className="text-sm text-foreground">
                      {infoModal.proof.proof_json
                        ? formatFileSize(new Blob([JSON.stringify(infoModal.proof.proof_json)]).size)
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Row 2: File Hash and Proof ID */}
                {infoModal.proof.proof_json && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="bg-card/50 border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-5 w-5 text-purple-400" />
                        <p className="text-sm text-muted-foreground">File Hash (SHA-256)</p>
                      </div>
                      <p className="font-mono text-xs text-foreground break-all">{infoModal.proof.file_hash}</p>
                    </div>

                    <div className="bg-card/50 border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-green-400" />
                        <p className="text-sm text-muted-foreground">Proof ID</p>
                      </div>
                      <p className="font-mono text-xs text-foreground break-all">{infoModal.proof.proof_json.proof_id}</p>
                    </div>
                  </div>
                )}

                {/* Row 3: Created and Proof Timestamp */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-pink-400" />
                      <p className="text-sm text-muted-foreground">Created</p>
                    </div>
                    <p className="text-sm text-foreground">
                      {new Date(infoModal.proof.created_at).toLocaleString('en-IE')}
                    </p>
                  </div>

                  {infoModal.proof.proof_json && (
                    <div className="bg-card/50 border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-pink-400" />
                        <p className="text-sm text-muted-foreground">Proof Timestamp</p>
                      </div>
                      <p className="font-mono text-xs text-foreground">{infoModal.proof.proof_json.timestamp}</p>
                    </div>
                  )}
                </div>

                {/* Row 4: Blockchain Anchoring (OTS) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className={`h-5 w-5 ${
                        infoModal.proof.ots_status === 'confirmed' ? 'text-green-400' :
                        infoModal.proof.ots_proof ? 'text-yellow-400' :
                        'text-muted-foreground'
                      }`} />
                      <p className="text-sm text-muted-foreground">Blockchain Anchoring</p>
                    </div>
                    <p className={`text-sm font-medium ${
                      infoModal.proof.ots_status === 'confirmed' ? 'text-green-400' :
                      infoModal.proof.ots_proof ? 'text-yellow-400' :
                      'text-muted-foreground'
                    }`}>
                      {infoModal.proof.ots_status === 'confirmed' ? 'Confirmed on Bitcoin blockchain' :
                       infoModal.proof.ots_proof ? 'Pending confirmation (1-6 hours)' :
                       'Not anchored (free tier)'}
                    </p>
                  </div>

                  {infoModal.proof.ots_proof && (
                    <div className="bg-card/50 border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="h-5 w-5 text-blue-400" />
                        <p className="text-sm text-muted-foreground">OTS Proof File</p>
                      </div>
                      <button
                        onClick={() => {
                          const raw = infoModal.proof!.ots_proof!
                          const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
                          const blob = new Blob([bytes], { type: 'application/octet-stream' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${(infoModal.proof!.proof_name || infoModal.proof!.file_name).replace(/[^a-zA-Z0-9-_]/g, '_')}.ots`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                      >
                        Download .ots file
                      </button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Verify at opentimestamps.org
                      </p>
                    </div>
                  )}
                </div>

                {/* Description Title */}
                {infoModal.proof.description_title && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <p className="text-sm text-muted-foreground">Description Title</p>
                    </div>
                    <p className="text-sm text-foreground">{infoModal.proof.description_title}</p>
                  </div>
                )}

                {/* Description Body */}
                {infoModal.proof.description_body && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-purple-400" />
                      <p className="text-sm text-muted-foreground">Full Description</p>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{infoModal.proof.description_body}</p>
                  </div>
                )}

                {/* Version Notes */}
                {infoModal.proof.version_notes && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-5 w-5 text-orange-400" />
                      <p className="text-sm text-muted-foreground">Version Notes (v{infoModal.proof.version_number})</p>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{infoModal.proof.version_notes}</p>
                  </div>
                )}

                {/* Official Document Date */}
                {infoModal.proof.official_document_date && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-green-400" />
                      <p className="text-sm text-muted-foreground">Official Document Date</p>
                    </div>
                    <p className="text-sm text-foreground">
                      {new Date(infoModal.proof.official_document_date).toLocaleString('en-IE')}
                    </p>
                  </div>
                )}

                {/* Legacy Description (fallback) */}
                {!infoModal.proof.description_body && infoModal.proof.proof_json?.description && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Description</p>
                    </div>
                    <p className="text-sm text-foreground">{infoModal.proof.proof_json.description}</p>
                  </div>
                )}

                {/* File Hashes List */}
                {infoModal.proof.proof_json?.file_hashes && (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash className="h-5 w-5 text-purple-400" />
                      <p className="text-sm text-muted-foreground">
                        All File Hashes ({Object.keys(infoModal.proof.proof_json.file_hashes).length} files)
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto bg-background/50 rounded p-3 space-y-2">
                      {Object.entries(infoModal.proof.proof_json.file_hashes).map(([path, hash]) => (
                        <div key={path} className="border-b border-border/50 pb-2 last:border-0">
                          <p className="text-xs text-muted-foreground mb-1">{path}</p>
                          <p className="font-mono text-xs text-foreground break-all">{hash as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setInfoModal({ show: false, proof: null })}
                className="w-full px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal for Verification */}
      {showVerifyPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-primary/30 rounded-lg p-6 max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                Privacy & Local Processing
              </h3>
              <p className="text-base text-muted-foreground">
                Before you proceed, here's what you should know:
              </p>
            </div>

            <div className="space-y-4 mb-6 overflow-y-auto flex-1">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-base font-semibold text-blue-400 mb-2">
                  What You'll See Next
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your browser will show a security alert asking permission to upload files to this site.
                  This is a standard browser security feature.
                </p>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-base font-semibold text-green-400 mb-2">
                  Your Privacy is Protected
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All file processing happens <strong>locally in your browser</strong>. Your files are hashed
                  on your device and <strong>never uploaded to our servers</strong>. Only the cryptographic
                  proof (hash) is stored.
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-base font-semibold text-amber-400 mb-2">
                  What We Store
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To help you identify your proofs, we store the <strong>file name(s)</strong> or <strong>folder name</strong> alongside the cryptographic hash. You can rename these at any time from your dashboard.
                </p>
              </div>

              <p className="text-sm text-center text-muted-foreground leading-relaxed">
                For more information, please refer to our{' '}
                <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={cancelVerifyPrivacy}
                className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmVerifyPrivacyAndProceed}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
              >
                <span className="hidden sm:inline">I Understand, Continue</span>
                <span className="sm:hidden">I Understand</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Verify Modal */}
      {verifyModal.show && verifyModal.proof && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border-2 border-green-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Re-verify Proof
            </h3>

            {!verifyModal.results ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                {verifyModal.isVerifying ? (
                  <>
                    {getProofSource(verifyModal.proof) !== 'manual' && verifyModal.progress ? (
                      <>
                        {/* Progress counter and bar for connected service proofs */}
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <p className="text-foreground font-medium">
                          Re-verifying {verifyModal.progress.current.toLocaleString()} of {verifyModal.progress.total.toLocaleString()} files
                        </p>
                        <div className="w-full max-w-md mt-4">
                          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-100"
                              style={{ width: `${verifyModal.progress.total > 0 ? (verifyModal.progress.current / verifyModal.progress.total) * 100 : 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            {verifyModal.progress.total > 0
                              ? `${Math.round((verifyModal.progress.current / verifyModal.progress.total) * 100)}%`
                              : 'Starting...'}
                          </p>
                        </div>

                        {/* Show source info while verifying */}
                        {getProofSource(verifyModal.proof) === 'github' && verifyModal.proof.repo_url && (
                          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg w-full max-w-md">
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="h-4 w-4 text-purple-400" />
                              <p className="text-sm font-medium text-purple-400">GitHub Proof</p>
                            </div>
                            {verifyModal.proof.commit_sha && (
                              <p className="text-xs text-muted-foreground">
                                Commit: <code className="text-foreground">{verifyModal.proof.commit_sha.substring(0, 12)}</code>
                              </p>
                            )}
                            {verifyModal.proof.branch_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Branch: <span className="text-foreground">{verifyModal.proof.branch_name}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mb-4"></div>
                        <p className="text-foreground font-medium">Verifying files...</p>
                        <p className="text-sm text-muted-foreground mt-2">Hashing and comparing files</p>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <p className="text-foreground font-medium mb-2">Select files or folder to verify</p>
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                      Choose the same files you originally hashed. We'll compare them to the stored proof to check for any modifications.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      // @ts-ignore - webkitdirectory is not in TS types
                      webkitdirectory="true"
                      directory="true"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="space-y-3 w-full max-w-md">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-all shadow-lg"
                      >
                        Select Files
                      </button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      <button
                        onClick={() => folderInputRef.current?.click()}
                        className="w-full px-6 py-3 rounded-lg border-2 border-green-500/30 hover:bg-green-500/10 text-foreground font-medium transition-all"
                      >
                        Select Folder
                      </button>

                      <button
                        onClick={closeVerifyModal}
                        className="w-full px-6 py-3 rounded-lg border border-border hover:bg-accent transition-colors mt-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  {/* Connected Service Info */}
                  {getProofSource(verifyModal.proof) === 'github' && verifyModal.proof.repo_url && (
                    <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        <p className="text-sm font-medium text-purple-400">GitHub Automated Proof</p>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Repository: <a href={verifyModal.proof.repo_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{verifyModal.proof.repo_url.replace('https://github.com/', '')}</a>
                        </p>
                        {verifyModal.proof.commit_sha && (
                          <p className="text-muted-foreground">
                            Commit: <a href={`${verifyModal.proof.repo_url}/commit/${verifyModal.proof.commit_sha}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono">{verifyModal.proof.commit_sha.substring(0, 12)}</a>
                          </p>
                        )}
                        {verifyModal.proof.branch_name && (
                          <p className="text-muted-foreground">
                            Branch: <span className="text-foreground">{verifyModal.proof.branch_name}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {getProofSource(verifyModal.proof) === 'cloud' && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-blue-400" />
                        <p className="text-sm font-medium text-blue-400">Cloud Automated Proof</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Verified against stored file hashes from connected cloud service.
                      </p>
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-4 w-4 text-green-500" />
                        <p className="text-xs text-muted-foreground">Matched</p>
                      </div>
                      <p className="text-xl font-bold text-green-500">
                        {verifyModal.results.filter(r => r.status === 'match').length}
                      </p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <X className="h-4 w-4 text-red-500" />
                        <p className="text-xs text-muted-foreground">Modified</p>
                      </div>
                      <p className="text-xl font-bold text-red-500">
                        {verifyModal.results.filter(r => r.status === 'mismatch').length}
                      </p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <X className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs text-muted-foreground">Missing</p>
                      </div>
                      <p className="text-xl font-bold text-yellow-500">
                        {verifyModal.results.filter(r => r.status === 'missing').length}
                      </p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Extra</p>
                      </div>
                      <p className="text-xl font-bold text-blue-500">
                        {verifyModal.results.filter(r => r.status === 'extra').length}
                      </p>
                    </div>
                  </div>

                  {/* Verification Failure Warning */}
                  {(verifyModal.results.filter(r => r.status === 'mismatch').length > 0 ||
                    verifyModal.results.filter(r => r.status === 'missing').length > 0) && (
                    <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
                      <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Proof Verification Failed
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Files have changed since this proof was created.</strong> This proof is now invalid for the current file versions. To verify this proof, you need the <strong className="text-foreground">original files from {new Date(verifyModal.proof!.created_at).toLocaleDateString('en-IE')}</strong>.
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        If these are updated files, create a "New Version" proof instead of modifying the originals.
                      </p>
                    </div>
                  )}

                  {/* Verification Success Message */}
                  {verifyModal.results.filter(r => r.status === 'mismatch').length === 0 &&
                   verifyModal.results.filter(r => r.status === 'missing').length === 0 &&
                   verifyModal.results.filter(r => r.status === 'match').length > 0 && (
                    <div className="mb-6 p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
                      <p className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Proof Verified Successfully
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        All files match the original proof. These files are <strong className="text-foreground">unchanged since {new Date(verifyModal.proof!.created_at).toLocaleDateString('en-IE')}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Results List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {verifyModal.results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 ${
                          result.status === 'match'
                            ? 'bg-green-500/5 border-green-500/30'
                            : result.status === 'mismatch'
                            ? 'bg-red-500/5 border-red-500/30'
                            : result.status === 'missing'
                            ? 'bg-yellow-500/5 border-yellow-500/30'
                            : 'bg-blue-500/5 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {result.status === 'match' ? (
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground mb-1">{result.path}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {result.status === 'match' && 'File matches the proof'}
                              {result.status === 'mismatch' && 'File has been modified'}
                              {result.status === 'missing' && 'File not found in selected files'}
                              {result.status === 'extra' && 'File not in original proof'}
                            </p>
                            {(result.status === 'mismatch' || result.status === 'missing') && (
                              <p className="font-mono text-xs text-muted-foreground truncate">
                                Expected: {result.expectedHash?.substring(0, 16)}...
                              </p>
                            )}
                            {result.status === 'mismatch' && (
                              <p className="font-mono text-xs text-muted-foreground truncate">
                                Actual: {result.actualHash?.substring(0, 16)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex gap-3">
                  <button
                    onClick={() => {
                      const source = getProofSource(verifyModal.proof!)
                      if (source === 'github' || source === 'cloud') {
                        setVerifyModal(prev => ({ ...prev, results: null, isVerifying: true, progress: null }))
                        autoVerifyConnectedProof(verifyModal.proof!)
                      } else {
                        setVerifyModal(prev => ({ ...prev, results: null, progress: null }))
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Verify Again
                  </button>
                  <button
                    onClick={closeVerifyModal}
                    className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Version Notes Modal */}
      {versionNotesModal.show && versionNotesModal.proof && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border-2 border-orange-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              Create New Version
            </h3>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                You're creating a new version of <span className="font-semibold text-foreground">{getRootProofMetadata(versionNotesModal.proof).proof_name || versionNotesModal.proof.file_name}</span>.
              </p>

              {/* Immutability Warning */}
              <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg mb-4">
                <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Critical: Preserve Your Original Files
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Do not modify your original files.</strong> Each proof is locked to the exact file versions that existed when you created it. If you change those original files, the proof becomes invalid and cannot be verified.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  <strong className="text-foreground">Keep all versions:</strong> If you have 10 proofs across different versions, you must keep all 10 file versions to verify each proof. Store them safely with restricted access.
                </p>
              </div>

              <label className="text-base font-semibold text-orange-400 mb-2 block">
                Version Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={versionNotesModal.versionNotes}
                onChange={(e) =>
                  setVersionNotesModal(prev => ({ ...prev, versionNotes: e.target.value }))
                }
                placeholder="Required: Describe what changed in this version (e.g., 'Updated contract terms', 'Added appendix B', 'Fixed typos')..."
                className="w-full px-3 py-2 rounded-lg bg-background border-2 border-orange-500/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2 italic">
                <span className="text-red-500 font-semibold">Required:</span> These notes maintain an audit trail of why this version exists and what changed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVersionNotesModal({ show: false, proof: null, versionNotes: '' })
                  setError(null)
                }}
                className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewVersion}
                disabled={!versionNotesModal.versionNotes.trim()}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all shadow-lg ${
                  versionNotesModal.versionNotes.trim()
                    ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Proofs</p>
              <p className="text-2xl font-bold">{activeProofs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <HardDrive className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Storage</p>
              <p className="text-2xl font-bold">{formatFileSize(totalStorage)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${
              !hasExpiry(subscription?.tier) && subscription?.status === 'active'
                ? 'bg-green-500/10'
                : subscription?.status === 'canceled'
                ? 'bg-red-500/10'
                : 'bg-yellow-500/10'
            }`}>
              <Shield className={`h-6 w-6 ${
                !hasExpiry(subscription?.tier) && subscription?.status === 'active'
                  ? 'text-green-500'
                  : subscription?.status === 'canceled'
                  ? 'text-red-500'
                  : 'text-yellow-600 text-yellow-500'
              }`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {!hasExpiry(subscription?.tier) && subscription?.status === 'active'
                  ? 'Protected - Lifetime'
                  : subscription?.status === 'canceled' && subscription?.proofs_expire_at
                  ? 'Expires In'
                  : subscription?.tier === 'free'
                  ? 'Free Tier: No long-term storage'
                  : 'Status'}
              </p>
              <p className="text-2xl font-bold">
                {!hasExpiry(subscription?.tier) && subscription?.status === 'active' ? (
                  '100%'
                ) : subscription?.status === 'canceled' && subscription?.proofs_expire_at ? (
                  <CountdownTimer expiresAt={subscription.proofs_expire_at} />
                ) : subscription?.tier === 'free' ? (
                  <span className="text-sm">Proofs only last 24 hours</span>
                ) : (
                  '---'
                )}
              </p>
            </div>
          </div>
          {subscription?.status === 'canceled' && subscription?.proofs_expire_at && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500 font-medium">
                Subscription canceled - Download or reactivate to keep your proofs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Header - Always Visible */}
      <div className="mb-4">
          {/* Search Bar and Tag Filter */}
          <div className="mb-4 flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search proofs by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Tag Filter */}
            <div className="relative lg:flex-1 flex gap-2">
              <div className="relative flex-1">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedTagIds(new Set([...Array.from(selectedTagIds), e.target.value]))
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Filter by tags...</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
              <Tooltip content="Manage tags">
              <button
                onClick={() => setShowTagManager(true)}
                className="px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                <div className="relative h-5 w-5">
                  <TagIcon className="h-5 w-5 text-muted-foreground rotate-90" />
                  <Settings className="h-3 w-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" strokeWidth={2.5} />
                </div>
              </button>
              </Tooltip>
            </div>
          </div>

          {/* Selected Tags */}
          {selectedTagIds.size > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.from(selectedTagIds).map(tagId => {
                const tag = tags.find(t => t.id === tagId)
                if (!tag) return null
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newSet = new Set(selectedTagIds)
                      newSet.delete(tagId)
                      setSelectedTagIds(newSet)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:opacity-80"
                    style={{
                      backgroundColor: tag.color + '20',
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <X className="h-3.5 w-3.5" />
                  </button>
                )
              })}
              {selectedTagIds.size > 1 && (
                <button
                  onClick={() => setSelectedTagIds(new Set())}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="mb-4">
            {/* Small screens: Header with Create New on same row */}
            <div className="flex items-center justify-between mb-3 sm:hidden">
              <h2 className="text-lg font-semibold">Your Proofs {(searchQuery || sourceFilters.size > 0) && `(${filteredProofs.length})`}</h2>
              {!editMode && (
                <Link
                  href="/create"
                  className="flex-1 max-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-white/30 bg-purple-600 hover:bg-purple-700 text-primary-foreground font-semibold text-sm transition-all"
                >
                  <Plus size={16} />
                  Create New
                </Link>
              )}
            </div>

            {/* Small screens: Proof Filter (full width) */}
            <div className="mb-3 sm:hidden [&>div]:w-full [&>div>button]:w-full">
              <ProofFilter value={proofFilter} onChange={setProofFilter} />
            </div>
            {availableSources.size > 1 && !editMode && (
              <div className="flex items-center justify-between gap-2 mb-3 sm:hidden">
                {(['manual', 'github', 'onedrive', 'google_drive', 'dropbox'] as DetailedProofSource[])
                  .filter(s => availableSources.has(s))
                  .map(source => {
                    const config = SOURCE_FILTER_CONFIG[source]
                    const isActive = sourceFilters.has(source)
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSourceFilter(source)}
                        className={`flex-1 inline-flex items-center justify-center h-10 rounded-lg border-2 transition-all ${
                          isActive ? config.activeColor : config.inactiveColor
                        }`}
                        title={`${isActive ? 'Hide' : 'Show only'} ${config.label} proofs`}
                      >
                        <SourceFilterIcon source={source} className="w-5 h-5" />
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Small screens: Action buttons row (full width) */}
            <div className="flex items-center gap-2 sm:hidden">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setShowEducationModal(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-sm transition-all"
                  >
                    <Lightbulb size={16} />
                    Tips
                  </button>
                  <Link
                    href="/dashboard/guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold text-sm transition-all"
                  >
                    <BookOpen size={16} />
                    Guide
                  </Link>
                  <button
                    onClick={() => setShowEditModeWarning(true)}
                    disabled={activeProofs.length === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      setSelectedProofIds(new Set())
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium text-sm transition-all"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      loadAvailableTeams()
                      setShowMoveModal(true)
                    }}
                    disabled={selectedProofIds.size < 1}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                      selectedProofIds.size < 1
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Move ({selectedProofIds.size})
                  </button>
                  <button
                    onClick={() => {
                      loadAvailableTeams()
                      setShowCopyModal(true)
                    }}
                    disabled={selectedProofIds.size < 1}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                      selectedProofIds.size < 1
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Copy ({selectedProofIds.size})
                  </button>
                  <button
                    onClick={() => {
                      const selectedProofs = activeProofs.filter(p => selectedProofIds.has(p.id))
                      setCombineData({ proofIds: Array.from(selectedProofIds), proofs: selectedProofs })
                      setShowCombineModal(true)
                    }}
                    disabled={selectedProofIds.size < 2}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                      selectedProofIds.size < 2
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <GitBranch size={16} />
                    Combine ({selectedProofIds.size})
                  </button>
                </>
              )}
            </div>

            {/* sm+ screens: Toolbar */}
            <div className="hidden sm:block space-y-3">
              {/* lg+: Single row with everything */}
              <div className="hidden lg:flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Your Proofs</h2>
                  <ProofFilter value={proofFilter} onChange={setProofFilter} />
                </div>

                {availableSources.size > 1 && !editMode && (
                  <div className="flex items-center gap-2">
                    {(['manual', 'github', 'onedrive', 'google_drive', 'dropbox'] as DetailedProofSource[])
                      .filter(s => availableSources.has(s))
                      .map(source => {
                        const config = SOURCE_FILTER_CONFIG[source]
                        const isActive = sourceFilters.has(source)
                        return (
                          <button
                            key={source}
                            onClick={() => toggleSourceFilter(source)}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all ${
                              isActive ? config.activeColor : config.inactiveColor
                            }`}
                            title={`${isActive ? 'Hide' : 'Show only'} ${config.label} proofs`}
                          >
                            <SourceFilterIcon source={source} className="w-5 h-5" />
                          </button>
                        )
                      })}
                  </div>
                )}

              <div className="flex items-center gap-2">
                {!editMode ? (
                  <>
                    <button
                      onClick={() => setShowEducationModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-sm transition-all"
                    >
                      <Lightbulb size={16} />
                      Tips
                    </button>
                    <Link
                      href="/dashboard/guide"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold text-sm transition-all"
                    >
                      <BookOpen size={16} />
                      Guide
                    </Link>
                    <button
                      onClick={() => setShowEditModeWarning(true)}
                      disabled={activeProofs.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit size={16} />
                      Edit Mode
                    </button>
                    <Link
                      href="/create"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/30 bg-purple-600 hover:bg-purple-700 text-primary-foreground font-semibold text-sm transition-all"
                    >
                      <Plus size={16} />
                      Create New
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditMode(false)
                        setSelectedProofIds(new Set())
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium text-sm transition-all"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        loadAvailableTeams()
                        setShowMoveModal(true)
                      }}
                      disabled={selectedProofIds.size < 1}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                        selectedProofIds.size < 1
                          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Move ({selectedProofIds.size})
                    </button>
                    <button
                      onClick={() => {
                        loadAvailableTeams()
                        setShowCopyModal(true)
                      }}
                      disabled={selectedProofIds.size < 1}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                        selectedProofIds.size < 1
                          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      Copy ({selectedProofIds.size})
                    </button>
                    <button
                      onClick={() => {
                        // For each selected proof ID, get ALL versions from its group
                        const allVersionsSet = new Set<Proof>()

                        selectedProofIds.forEach(proofId => {
                          const selectedProof = activeProofs.find(p => p.id === proofId)
                          if (selectedProof) {
                            // Use same grouping logic as the main grouping function
                            let groupKey: string
                            if (selectedProof.proof_group_id) {
                              groupKey = selectedProof.proof_group_id
                            } else if (selectedProof.parent_proof_id) {
                              groupKey = selectedProof.root_proof_id || selectedProof.id
                            } else {
                              // Standalone proof - uses its own ID as groupKey
                              groupKey = selectedProof.id
                            }
                            const versions = proofGroups[groupKey] || []
                            versions.forEach(v => allVersionsSet.add(v))
                          }
                        })

                        const allVersions = Array.from(allVersionsSet)
                        const allVersionIds = allVersions.map(v => v.id)

                        setCombineData({ proofIds: allVersionIds, proofs: allVersions })
                        setShowCombineModal(true)
                      }}
                      disabled={selectedProofIds.size < 2}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all ${
                        selectedProofIds.size < 2
                          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <GitBranch size={16} />
                      Combine ({selectedProofIds.size})
                    </button>
                  </>
                )}
              </div>
              </div>

              {/* sm-lg: Row 1 — Your Proofs + dropdown + Create New */}
              <div className="flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Your Proofs</h2>
                  <ProofFilter value={proofFilter} onChange={setProofFilter} />
                </div>
                {!editMode && (
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/30 bg-purple-600 hover:bg-purple-700 text-primary-foreground font-semibold text-sm transition-all"
                  >
                    <Plus size={16} />
                    Create New
                  </Link>
                )}
              </div>

              {/* sm-lg: Row 2 — Source filters (left) + Tips/Guide/Edit Mode (right) */}
              <div className="flex items-center justify-between lg:hidden">
                {availableSources.size > 1 && !editMode ? (
                  <div className="flex items-center gap-2">
                    {(['manual', 'github', 'onedrive', 'google_drive', 'dropbox'] as DetailedProofSource[])
                      .filter(s => availableSources.has(s))
                      .map(source => {
                        const config = SOURCE_FILTER_CONFIG[source]
                        const isActive = sourceFilters.has(source)
                        return (
                          <button
                            key={source}
                            onClick={() => toggleSourceFilter(source)}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all ${
                              isActive ? config.activeColor : config.inactiveColor
                            }`}
                            title={`${isActive ? 'Hide' : 'Show only'} ${config.label} proofs`}
                          >
                            <SourceFilterIcon source={source} className="w-5 h-5" />
                          </button>
                        )
                      })}
                  </div>
                ) : <div />}
                {!editMode && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEducationModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-sm transition-all"
                    >
                      <Lightbulb size={16} />
                      Tips
                    </button>
                    <Link
                      href="/dashboard/guide"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold text-sm transition-all"
                    >
                      <BookOpen size={16} />
                      Guide
                    </Link>
                    <button
                      onClick={() => setShowEditModeWarning(true)}
                      disabled={activeProofs.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit size={16} />
                      Edit Mode
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loading / Empty States */}
          {loading ? (
            <div className="bg-card/30 backdrop-blur-sm border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading proofs...</p>
            </div>
          ) : activeProofs.length === 0 ? (
            <div className="bg-card/30 backdrop-blur-sm border-2 border-dashed border-border rounded-lg p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No proofs yet</h3>
              <p className="text-muted-foreground mb-6">
                {proofFilter.type === 'personal'
                  ? 'Create your first cryptographic proof to get started'
                  : `No proofs in ${proofFilter.teamName || 'this team'} yet`}
              </p>
              <Link
                href="/create"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
              >
                Create Proof
              </Link>
            </div>
          ) : filteredProofs.length === 0 && searchQuery ? (
            <div className="bg-card/30 backdrop-blur-sm border-2 border-dashed border-border rounded-lg p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No proofs found</h3>
              <p className="text-muted-foreground mb-4">
                No proofs match your search: "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline font-medium"
              >
                Clear search
              </button>
            </div>
          ) : null}

          {filteredProofs.length > 0 && filteredProofs.map((proof) => {
            const groupKey = proof.proof_group_id || (proof.parent_proof_id ? (proof.root_proof_id || proof.id) : proof.id) // Group by proof_group_id (if exists) or root_proof_id
            const versions = proofGroups[groupKey] || []
            const hasMultipleVersions = versions.length > 1

            return (
              <div
                key={proof.id}
                className={`bg-card/50 backdrop-blur-sm border-2 rounded-lg p-5 transition-all ${
                  editMode && selectedProofIds.has(proof.id)
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-primary/20 hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="flex-1 min-w-0 mb-2">
                    <div className="mb-3">
                      {/* Proof name row - responsive layout */}
                      <div className="mb-2">
                        {/* Small/Medium screens: Conditional layout based on version dropdown */}
                        <div className="lg:hidden">
                          {/* If has version dropdown: Clear row structure */}
                          {hasMultipleVersions ? (
                            <div className="space-y-2">
                              {/* Row 1: Proof name + Version dropdown */}
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-semibold flex items-center gap-2 flex-1 min-w-0">
                                  {editMode && (
                                    <input
                                      type="checkbox"
                                      checked={selectedProofIds.has(proof.id)}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedProofIds)
                                        if (e.target.checked) {
                                          newSelected.add(proof.id)
                                        } else {
                                          newSelected.delete(proof.id)
                                        }
                                        setSelectedProofIds(newSelected)
                                      }}
                                      className="w-5 h-5 rounded border-2 border-orange-500 text-orange-500 focus:ring-2 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                                    />
                                  )}
                                  <ProofSourceIcon proof={proof} />
                                  <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
                                    {proof.proof_name || proof.file_name}
                                  </span>
                                  {(() => {
                                    const rootMetadata = getRootProofMetadata(proof)
                                    if (rootMetadata.description_title || rootMetadata.description_body) {
                                      return (
                                        <div className="relative group flex-shrink-0 info-tooltip-container">
                                          <InfoIcon
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setOpenInfoTooltip(openInfoTooltip === `desktop-${proof.id}` ? null : `desktop-${proof.id}`)
                                            }}
                                            className="h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                                          />
                                          <div className={`absolute left-0 top-full mt-2 w-64 p-3 bg-card border-2 border-blue-500/30 rounded-lg shadow-xl transition-all z-50 ${
                                            openInfoTooltip === `desktop-${proof.id}` ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none'
                                          }`}>
                                            {rootMetadata.description_title && (
                                              <p className="text-xs font-semibold text-foreground mb-1">
                                                {rootMetadata.description_title}
                                              </p>
                                            )}
                                            {rootMetadata.description_body && (
                                              <p className="text-xs text-muted-foreground line-clamp-3">
                                                {rootMetadata.description_body}
                                              </p>
                                            )}
                                            <p className="text-xs text-blue-500 mt-2 italic">Click Info button to see full details</p>
                                          </div>
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </h3>

                                {/* Version dropdown with tooltip - auto width */}
                                <div className="relative group flex-shrink-0">
                                  <select
                                    value={proof.id}
                                    onChange={(e) => setSelectedVersions({ ...selectedVersions, [groupKey]: e.target.value })}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    style={{ backgroundImage: 'none' }}
                                  >
                                    {versions.map(v => {
                                      const date = new Date(v.created_at)
                                      const dateStr = date.toLocaleDateString('en-IE')
                                      const timeStr = date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
                                      return (
                                        <option key={v.id} value={v.id} style={{ backgroundColor: '#78350f', color: '#fef3c7' }}>
                                          v{v.version_number} ({dateStr} {timeStr})
                                        </option>
                                      )
                                    })}
                                  </select>
                                  {/* Version notes tooltip (desktop only) */}
                                  {proof.version_notes && (
                                    <div className="hidden lg:block absolute right-0 top-full mt-2 w-72 p-3 bg-card border-2 border-orange-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                      <p className="text-xs font-semibold text-orange-400 mb-1">
                                        Version {proof.version_number} Notes:
                                      </p>
                                      <p className="text-sm text-foreground whitespace-pre-wrap">
                                        {proof.version_notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Tags (left) + Tag lock + Tag dropdown (right) - SAME ROW */}
                              <div className="flex items-center justify-between gap-2">
                                {/* Tags on the left */}
                                <div className="flex overflow-x-auto items-center gap-2 flex-1 min-w-0 scrollbar-hide">
                                  {(() => {
                                    const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                                    const proofTagObjects = tags.filter(t => proofTagIds.includes(t.id))

                                    return proofTagObjects.map(tag => (
                                      <button
                                        key={tag.id}
                                        onClick={() => {
                                          if (tagsLocked[groupKey] ?? true) return
                                          removeTagFromProof(proof.id, tag.id, proof.root_proof_id)
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold border-2 transition-all flex-shrink-0 ${
                                          (tagsLocked[groupKey] ?? true) ? 'cursor-not-allowed opacity-60' : 'hover:opacity-70 cursor-pointer'
                                        }`}
                                        style={{
                                          backgroundColor: tag.color + '20',
                                          borderColor: tag.color,
                                          color: tag.color,
                                        }}
                                        title={(tagsLocked[groupKey] ?? true) ? 'Unlock tags to remove' : 'Click to remove tag'}
                                      >
                                        {tag.name}
                                        <X className="h-3 w-3" />
                                      </button>
                                    ))
                                  })()}
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Tag lock/unlock button */}
                                  <div className="relative group">
                                    <button
                                      onClick={() => setTagsLocked({ ...tagsLocked, [groupKey]: !(tagsLocked[groupKey] ?? true) })}
                                      className={`p-2 rounded-lg transition-all border-2 ${
                                        (tagsLocked[groupKey] ?? true)
                                          ? 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-500'
                                          : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-500'
                                      }`}
                                    >
                                      {(tagsLocked[groupKey] ?? true) ? <Lock size={16} /> : <Unlock size={16} />}
                                    </button>
                                    {/* Tooltip */}
                                    <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-card border-2 border-primary/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                      <p className="text-xs text-muted-foreground">
                                        {(tagsLocked[groupKey] ?? true)
                                          ? 'Tags are locked. Click to unlock and allow tag removal.'
                                          : 'Tags are unlocked. Click to lock and prevent accidental removal.'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Tag dropdown on the right */}
                                  {(() => {
                                    const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                                    const availableTags = tags.filter(t => !proofTagIds.includes(t.id))
                                    return (
                                      <CustomSelect
                                        value=""
                                        onChange={(val) => addTagToProof(proof.id, val, proof.root_proof_id)}
                                        placeholder="+ Tag"
                                        color="teal"
                                        size="sm"
                                        options={availableTags.map(tag => ({
                                          value: tag.id,
                                          label: tag.name,
                                        }))}
                                        className="flex-shrink-0"
                                      />
                                    )
                                  })()}
                                </div>
                              </div>

                              {/* Row 3: Timer (if exists) */}
                              {groupEarliestExpiry[groupKey] && (
                                <div className="flex justify-end">
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full min-w-[80px] text-center ${
                                    new Date(groupEarliestExpiry[groupKey]!).getTime() - Date.now() < 4 * 60 * 60 * 1000
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                                  }`}>
                                    <CountdownTimer expiresAt={groupEarliestExpiry[groupKey]!} className="inline" />
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* If NO version dropdown: same row structure as with version */
                            <div className="space-y-2">
                              {/* Row 1: Proof name only */}
                              <h3 className="text-base font-semibold flex items-center gap-2">
                                {editMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedProofIds.has(proof.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedProofIds)
                                      if (e.target.checked) {
                                        newSelected.add(proof.id)
                                      } else {
                                        newSelected.delete(proof.id)
                                      }
                                      setSelectedProofIds(newSelected)
                                    }}
                                    className="w-5 h-5 rounded border-2 border-orange-500 text-orange-500 focus:ring-2 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                                  />
                                )}
                                <ProofSourceIcon proof={proof} />
                                <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
                                  {getRootProofMetadata(proof).proof_name || proof.file_name}
                                </span>
                                {(() => {
                                  const rootMetadata = getRootProofMetadata(proof)
                                  if (rootMetadata.description_title || rootMetadata.description_body) {
                                    return (
                                      <div className="relative group flex-shrink-0 info-tooltip-container">
                                        <InfoIcon
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenInfoTooltip(openInfoTooltip === `tablet-${proof.id}` ? null : `tablet-${proof.id}`)
                                          }}
                                          className="h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                                        />
                                        <div className={`absolute left-0 top-full mt-2 w-64 p-3 bg-card border-2 border-blue-500/30 rounded-lg shadow-xl transition-all z-50 ${
                                          openInfoTooltip === `tablet-${proof.id}` ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none'
                                        }`}>
                                          {rootMetadata.description_title && (
                                            <p className="text-xs font-semibold text-foreground mb-1">
                                              {rootMetadata.description_title}
                                            </p>
                                          )}
                                          {rootMetadata.description_body && (
                                            <p className="text-xs text-muted-foreground line-clamp-3">
                                              {rootMetadata.description_body}
                                            </p>
                                          )}
                                          <p className="text-xs text-blue-500 mt-2 italic">Click Info button to see full details</p>
                                        </div>
                                      </div>
                                    )
                                  }
                                  return null
                                })()}
                              </h3>

                              {/* Row 2: Tags (left) + Tag lock + Tag dropdown (right) - SAME ROW */}
                              <div className="flex items-center justify-between gap-2">
                                {/* Tags on the left */}
                                <div className="flex overflow-x-auto items-center gap-2 flex-1 min-w-0 scrollbar-hide">
                                  {(() => {
                                    const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                                    const proofTagObjects = tags.filter(t => proofTagIds.includes(t.id))

                                    return proofTagObjects.map(tag => (
                                      <button
                                        key={tag.id}
                                        onClick={() => {
                                          if (tagsLocked[groupKey] ?? true) return
                                          removeTagFromProof(proof.id, tag.id, proof.root_proof_id)
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold border-2 transition-all flex-shrink-0 ${
                                          (tagsLocked[groupKey] ?? true) ? 'cursor-not-allowed opacity-60' : 'hover:opacity-70 cursor-pointer'
                                        }`}
                                        style={{
                                          backgroundColor: tag.color + '20',
                                          borderColor: tag.color,
                                          color: tag.color,
                                        }}
                                        title={(tagsLocked[groupKey] ?? true) ? 'Unlock tags to remove' : 'Click to remove tag'}
                                      >
                                        {tag.name}
                                        <X className="h-3 w-3" />
                                      </button>
                                    ))
                                  })()}
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Tag lock/unlock button */}
                                  <div className="relative group">
                                    <button
                                      onClick={() => setTagsLocked({ ...tagsLocked, [groupKey]: !(tagsLocked[groupKey] ?? true) })}
                                      className={`p-2 rounded-lg transition-all border-2 ${
                                        (tagsLocked[groupKey] ?? true)
                                          ? 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-500'
                                          : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-500'
                                      }`}
                                    >
                                      {(tagsLocked[groupKey] ?? true) ? <Lock size={16} /> : <Unlock size={16} />}
                                    </button>
                                    {/* Tooltip */}
                                    <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-card border-2 border-primary/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                      <p className="text-xs text-muted-foreground">
                                        {(tagsLocked[groupKey] ?? true)
                                          ? 'Tags are locked. Click to unlock and allow tag removal.'
                                          : 'Tags are unlocked. Click to lock and prevent accidental removal.'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Tag dropdown on the right */}
                                  {(() => {
                                    const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                                    const availableTags = tags.filter(t => !proofTagIds.includes(t.id))
                                    return (
                                      <CustomSelect
                                        value=""
                                        onChange={(val) => addTagToProof(proof.id, val, proof.root_proof_id)}
                                        placeholder="+ Tag"
                                        color="teal"
                                        size="sm"
                                        options={availableTags.map(tag => ({
                                          value: tag.id,
                                          label: tag.name,
                                        }))}
                                        className="flex-shrink-0"
                                      />
                                    )
                                  })()}
                                </div>
                              </div>

                              {/* Row 3: Timer (if exists) */}
                              {groupEarliestExpiry[groupKey] && (
                                <div className="flex justify-end">
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full min-w-[80px] text-center ${
                                    new Date(groupEarliestExpiry[groupKey]!).getTime() - Date.now() < 4 * 60 * 60 * 1000
                                      ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                                  }`}>
                                    <CountdownTimer expiresAt={groupEarliestExpiry[groupKey]!} className="inline" />
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Large screens: Grid layout */}
                        <div className="hidden lg:grid lg:grid-cols-12 gap-2 items-center">
                          {/* Column 1-2: Proof name (COL-2 - same width as Download button) */}
                          <div className="col-span-2 flex items-center gap-2 min-w-0">
                            <h3 className="text-base font-semibold flex items-center gap-2 flex-shrink-0">
                              {editMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedProofIds.has(proof.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedProofIds)
                                    if (e.target.checked) {
                                      newSelected.add(proof.id)
                                    } else {
                                      newSelected.delete(proof.id)
                                    }
                                    setSelectedProofIds(newSelected)
                                  }}
                                  className="w-5 h-5 rounded border-2 border-orange-500 text-orange-500 focus:ring-2 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                                />
                              )}
                              <ProofSourceIcon proof={proof} />
                              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate" style={{ paddingBottom: 0 }}>
                                {getRootProofMetadata(proof).proof_name || proof.file_name}
                              </span>
                              {(() => {
                                const rootMetadata = getRootProofMetadata(proof)
                                if (rootMetadata.description_title || rootMetadata.description_body) {
                                  return (
                                    <div className="relative group flex-shrink-0 info-tooltip-container">
                                      <InfoIcon
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenInfoTooltip(openInfoTooltip === `mobile-${proof.id}` ? null : `mobile-${proof.id}`)
                                        }}
                                        className="h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
                                      />
                                      <div className={`absolute left-0 top-full mt-2 w-64 p-3 bg-card border-2 border-blue-500/30 rounded-lg shadow-xl transition-all z-50 ${
                                        openInfoTooltip === `mobile-${proof.id}` ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none'
                                      }`}>
                                        {rootMetadata.description_title && (
                                          <p className="text-xs font-semibold text-foreground mb-1">
                                            {rootMetadata.description_title}
                                          </p>
                                        )}
                                        {rootMetadata.description_body && (
                                          <p className="text-xs text-muted-foreground line-clamp-3">
                                            {rootMetadata.description_body}
                                          </p>
                                        )}
                                        <p className="text-xs text-blue-500 mt-2 italic">Click Info button to see full details</p>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </h3>
                          </div>

                          {/* Column 3-6: Tags (COL-4) */}
                          <div className="col-span-4 flex overflow-x-auto items-center gap-2 min-w-0 scrollbar-hide">
                            {(() => {
                              const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                              const proofTagObjects = tags.filter(t => proofTagIds.includes(t.id))

                              return proofTagObjects.map(tag => (
                                <button
                                  key={tag.id}
                                  onClick={() => {
                                    if (tagsLocked[groupKey] ?? true) return
                                    removeTagFromProof(proof.id, tag.id, proof.root_proof_id)
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold border-2 transition-all flex-shrink-0 ${
                                    (tagsLocked[groupKey] ?? true) ? 'cursor-not-allowed opacity-60' : 'hover:opacity-70 cursor-pointer'
                                  }`}
                                  style={{
                                    backgroundColor: tag.color + '20',
                                    borderColor: tag.color,
                                    color: tag.color,
                                  }}
                                  title={(tagsLocked[groupKey] ?? true) ? 'Unlock tags to remove' : 'Click to remove tag'}
                                >
                                  {tag.name}
                                  <X className="h-3 w-3" />
                                </button>
                              ))
                            })()}
                          </div>

                          {/* Column 7-8: Tag dropdown (COL-2, right-aligned) */}
                          <div className="col-span-2 flex justify-end items-center gap-2">
                            {/* Tag lock/unlock button */}
                            <div className="relative group">
                              <button
                                onClick={() => setTagsLocked({ ...tagsLocked, [groupKey]: !(tagsLocked[groupKey] ?? true) })}
                                className={`p-2 rounded-lg transition-all border-2 ${
                                  (tagsLocked[groupKey] ?? true)
                                    ? 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30 text-gray-500'
                                    : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-500'
                                }`}
                              >
                                {(tagsLocked[groupKey] ?? true) ? <Lock size={16} /> : <Unlock size={16} />}
                              </button>
                              {/* Tooltip */}
                              <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-card border-2 border-primary/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                <p className="text-xs text-muted-foreground">
                                  {(tagsLocked[groupKey] ?? true)
                                    ? 'Tags are locked. Click to unlock and allow tag removal.'
                                    : 'Tags are unlocked. Click to lock and prevent accidental removal.'}
                                </p>
                              </div>
                            </div>

                            {/* Add Tag dropdown */}
                            {(() => {
                              const proofTagIds = proofTags.filter(pt => pt.root_proof_id === proof.root_proof_id).map(pt => pt.tag_id)
                              const availableTags = tags.filter(t => !proofTagIds.includes(t.id))
                              return (
                                <CustomSelect
                                  value=""
                                  onChange={(val) => addTagToProof(proof.id, val, proof.root_proof_id)}
                                  placeholder="+ Tag"
                                  color="teal"
                                  size="sm"
                                  options={availableTags.map(tag => ({
                                    value: tag.id,
                                    label: tag.name,
                                  }))}
                                  className="flex-shrink-0"
                                />
                              )
                            })()}
                          </div>

                          {/* Column 9-12: Version dropdown (left) + Expiry timer (right) (COL-4) */}
                          <div className="col-span-4 flex items-center justify-end gap-2">
                            {/* Version dropdown with tooltip (left-aligned) */}
                            {hasMultipleVersions && (
                              <div className="relative group mr-auto">
                                <select
                                  value={proof.id}
                                  onChange={(e) => setSelectedVersions({ ...selectedVersions, [groupKey]: e.target.value })}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                  style={{ backgroundImage: 'none' }}
                                >
                                  {versions.map(v => {
                                    const date = new Date(v.created_at)
                                    const dateStr = date.toLocaleDateString('en-IE')
                                    const timeStr = date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
                                    return (
                                      <option key={v.id} value={v.id} style={{ backgroundColor: '#78350f', color: '#fef3c7' }}>
                                        v{v.version_number} ({dateStr} {timeStr})
                                      </option>
                                    )
                                  })}
                                </select>
                                {/* Version notes tooltip */}
                                {proof.version_notes && (
                                  <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-card border-2 border-orange-500/30 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                    <p className="text-xs font-semibold text-orange-400 mb-1">
                                      Version {proof.version_number} Notes:
                                    </p>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">
                                      {proof.version_notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Expiry timer (right-aligned) - shows earliest expiry for entire group */}
                            {groupEarliestExpiry[groupKey] && (
                              <span className={`text-xs font-medium px-2 py-1 rounded-full min-w-[80px] text-center ${
                                new Date(groupEarliestExpiry[groupKey]!).getTime() - Date.now() < 4 * 60 * 60 * 1000
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                              }`}>
                                <CountdownTimer expiresAt={groupEarliestExpiry[groupKey]!} className="inline" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
                    {/* Files - Left aligned */}
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-purple-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Files</p>
                        <p className="text-sm font-medium text-foreground/80">
                          {proof.proof_json?.total_files || 1}
                        </p>
                      </div>
                    </div>

                    {/* Size - Right on small, left on lg */}
                    {proof.proof_json && (
                      <div className="flex items-center gap-2 justify-end lg:justify-start">
                        <HardDrive size={16} className="text-blue-400 flex-shrink-0 hidden lg:block" />
                        <div className="min-w-0 text-right lg:text-left">
                          <p className="text-xs text-muted-foreground">Proof Size</p>
                          <p className="text-sm font-medium text-foreground/80">
                            {formatFileSize(new Blob([JSON.stringify(proof.proof_json)]).size)}
                          </p>
                        </div>
                        <HardDrive size={16} className="text-blue-400 flex-shrink-0 lg:hidden" />
                      </div>
                    )}

                    {/* Blockchain Status — left aligned */}
                    {subscription?.tier === 'free' && !proof.ots_proof ? (
                      <Tooltip content="Blockchain anchoring is not available on the Free plan. Upgrade to anchor your proofs on the Bitcoin public ledger.">
                        <div className="flex items-center gap-2 cursor-default">
                          <Link2 size={16} className="flex-shrink-0 text-muted-foreground/40" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Blockchain</p>
                            <p className="text-sm font-medium text-muted-foreground/40">Not available</p>
                          </div>
                        </div>
                      </Tooltip>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link2 size={16} className={`flex-shrink-0 ${
                          proof.ots_status === 'confirmed' ? 'text-green-400' :
                          proof.ots_proof ? 'text-yellow-400' :
                          'text-muted-foreground/40'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Blockchain</p>
                          <p className={`text-sm font-medium ${
                            proof.ots_status === 'confirmed' ? 'text-green-400' :
                            proof.ots_proof ? 'text-yellow-400' :
                            'text-muted-foreground/40'
                          }`}>
                            {proof.ots_status === 'confirmed' ? 'Confirmed' :
                             proof.ots_proof ? 'Pending' :
                             'Not anchored'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Anchored — right aligned */}
                    {subscription?.tier === 'free' && !proof.ots_proof ? (
                      <Tooltip content="Public ledger timestamps are not available on the Free plan. Upgrade to get permanent, independently verifiable proof timestamps.">
                        <div className="flex items-center gap-2 justify-end cursor-default w-full">
                          <div className="min-w-0 text-right">
                            <p className="text-xs text-muted-foreground">Anchored</p>
                            <p className="text-sm font-medium text-muted-foreground/40">Not available</p>
                          </div>
                          <Shield size={16} className="flex-shrink-0 text-muted-foreground/40" />
                        </div>
                      </Tooltip>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <div className="min-w-0 text-right">
                          <p className="text-xs text-muted-foreground">Anchored</p>
                          <p className={`text-sm font-medium ${
                            proof.ots_status === 'confirmed' ? 'text-green-400' :
                            proof.ots_proof ? 'text-yellow-400' :
                            'text-muted-foreground/40'
                          }`}>
                            {proof.ots_status === 'confirmed'
                              ? new Date(proof.updated_at).toLocaleDateString('en-IE')
                              : proof.ots_proof ? 'Pending' : '—'}
                          </p>
                        </div>
                        <Shield size={16} className={`flex-shrink-0 ${
                          proof.ots_status === 'confirmed' ? 'text-green-400' :
                          proof.ots_proof ? 'text-yellow-400' :
                          'text-muted-foreground/40'
                        }`} />
                      </div>
                    )}

                    {/* Age - Left on small, right on lg */}
                    <div className="flex items-center gap-2 lg:justify-end">
                      <Calendar size={16} className="text-green-400 flex-shrink-0 lg:hidden" />
                      <div className="min-w-0 lg:text-right">
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="text-sm font-medium text-foreground/80">
                          <span className="lg:hidden">{formatAgeShort(proof.created_at)}</span>
                          <span className="hidden lg:inline">{formatDistanceToNow(new Date(proof.created_at), { addSuffix: true })}</span>
                        </p>
                      </div>
                      <Calendar size={16} className="text-green-400 flex-shrink-0 hidden lg:block" />
                    </div>

                    {/* Created - Right aligned */}
                    <div className="flex items-center gap-2 justify-end">
                      <div className="min-w-0 text-right">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm font-medium text-foreground/80">
                          {new Date(proof.created_at).toLocaleDateString('en-IE')}
                        </p>
                      </div>
                      <Calendar size={16} className="text-pink-400 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Buttons — lg uses 12-col grid so New Version aligns with version dropdown above */}
                  <div className="grid grid-cols-2 lg:grid-cols-12 gap-2">
                  <button
                    onClick={() => downloadProof(proof)}
                    className="order-1 lg:order-none col-span-2 lg:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setInfoModal({ show: true, proof })}
                    className="order-2 lg:order-none lg:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-500 font-medium text-sm transition-all"
                  >
                    <Info size={16} />
                    <span>Info</span>
                  </button>
                  <button
                    onClick={() => initiateEdit(proof)}
                    className="order-3 lg:order-none lg:col-span-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-500 font-medium text-sm transition-all"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => initiateVerify(proof)}
                    className="order-4 lg:order-none lg:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-500 font-medium text-sm transition-all"
                  >
                    <CheckCircle size={16} />
                    <span>Verify</span>
                  </button>

                  {subscription?.tier === 'free' ? (
                    <Tooltip content="Share links require blockchain anchoring. Upgrade your plan to access public ledger verification." className="order-6 lg:order-none lg:col-span-2">
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-500/5 border border-slate-500/20 text-slate-500 font-medium text-sm cursor-not-allowed w-full"
                      >
                        <Share2 size={16} />
                        <span>Share</span>
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      onClick={() => initiateShare(proof)}
                      className="order-6 lg:order-none lg:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-500 font-medium text-sm transition-all"
                    >
                      <Share2 size={16} />
                      <span>Share</span>
                    </button>
                  )}

                  <button
                    onClick={() => initiateNewVersion(proof)}
                    className="order-5 lg:order-none lg:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 font-medium text-sm transition-all"
                  >
                    <GitBranch size={16} className="hidden lg:inline" />
                    <Plus size={16} className="lg:hidden" />
                    <span className="hidden lg:inline">New Version</span>
                    <span className="lg:hidden">Version</span>
                  </button>
                  <button
                    onClick={() => initiateDelete(proof.id)}
                    className="order-7 lg:order-none lg:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 font-medium text-sm transition-all"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
                </div>
              </div>
            )
        })}
      </div>
      </div>

    {/* Edit Details Modal */}
    {editModal.show && editModal.proof && (
      <ProofDetailsModal
        isOpen={editModal.show}
        onClose={() => setEditModal({ show: false, proof: null })}
        onSave={handleSaveDetails}
        initialData={(() => {
          const rootMetadata = getRootProofMetadata(editModal.proof)
          return {
            proof_name: rootMetadata.proof_name || editModal.proof.file_name,
            description_title: rootMetadata.description_title || undefined,
            description_body: rootMetadata.description_body || undefined,
            official_document_date: rootMetadata.official_document_date || undefined,
          }
        })()}
      />
    )}

    {/* Edit Mode Warning Modal with Tabs */}
    {showEditModeWarning && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-2 border-purple-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              ⚠️ Entering Edit Mode
            </h3>
            <p className="text-base text-muted-foreground">
              Choose an action to perform on your proofs
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => setEditModeTab('move')}
              className={`px-4 py-2 font-medium transition-all ${
                editModeTab === 'move'
                  ? 'text-blue-400 border-b-2 border-blue-600 border-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Move
            </button>
            <button
              onClick={() => setEditModeTab('copy')}
              className={`px-4 py-2 font-medium transition-all ${
                editModeTab === 'copy'
                  ? 'text-green-400 border-b-2 border-green-600 border-green-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Copy
            </button>
            <button
              onClick={() => setEditModeTab('combine')}
              className={`px-4 py-2 font-medium transition-all ${
                editModeTab === 'combine'
                  ? 'text-purple-400 border-b-2 border-purple-600 border-purple-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Combine
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4 mb-6 overflow-y-auto flex-1">
            {editModeTab === 'move' && (
              <>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-base font-semibold text-blue-400 mb-2">
                    What is Move?
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Move proofs between your personal storage and teams. Transfer ownership and access control while preserving all version history and metadata.
                  </p>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-base font-semibold text-orange-400 mb-2">
                    How It Works
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Select one or more proof cards</li>
                    <li>Choose destination (Personal or Team)</li>
                    <li>Proof is moved, not copied</li>
                    <li>All versions and metadata are preserved</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-base font-semibold text-yellow-400 mb-2">
                    ⚠️ Important Notes
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Moving to a team shares access with all team members</li>
                    <li>Moving to personal makes it private to you only</li>
                    <li>Team admins may need to approve transfers</li>
                  </ul>
                </div>
              </>
            )}

            {editModeTab === 'copy' && (
              <>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-base font-semibold text-green-400 mb-2">
                    What is Copy?
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create a duplicate of proofs in a different location. Useful for sharing proofs between personal and team storage without losing the original.
                  </p>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-base font-semibold text-orange-400 mb-2">
                    How It Works
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Select one or more proof cards</li>
                    <li>Choose destination (Personal or Team)</li>
                    <li>A copy is created in the destination</li>
                    <li>Original proof remains unchanged</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-base font-semibold text-blue-400 mb-2">
                    When to Use Copy
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Share a proof with a team while keeping your personal copy</li>
                    <li>Create backups in multiple locations</li>
                    <li>Distribute proofs across teams</li>
                  </ul>
                </div>
              </>
            )}

            {editModeTab === 'combine' && (
              <>
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-base font-semibold text-purple-400 mb-2">
                    What is Combine?
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Merge multiple separate proof cards into a single unified version history. Use this when you accidentally created separate cards that should have been versions of each other.
                  </p>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-base font-semibold text-orange-400 mb-2">
                    How It Works
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Select 2 or more proof cards using checkboxes</li>
                    <li>Click "Combine Selected" to merge them</li>
                    <li>All versions are sorted chronologically by timestamp</li>
                    <li>They become one unified proof card</li>
                  </ul>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-base font-semibold text-red-400 mb-2">
                    ⚠️ IMPORTANT: This Action is IRREVERSIBLE
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>You cannot undo combining proofs</li>
                    <li>Once merged, they stay merged permanently</li>
                    <li>You take full responsibility for this action</li>
                    <li>ProveChain only stores hashes - we're not responsible for misorganized proofs</li>
                  </ul>
                </div>
              </>
            )}

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-base font-semibold text-blue-400 mb-2">
                Before You Continue
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Make sure you understand what Edit Mode does. If you're unsure, check the{' '}
                <Link
                  href="/dashboard/guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline font-medium hover:text-blue-700 hover:text-blue-300"
                >
                  Dashboard Guide
                </Link>
                {' '}first.
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => setShowEditModeWarning(false)}
              className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowEditModeWarning(false)
                setEditMode(true)
              }}
              className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
            >
              <span className="sm:hidden">I Understand</span>
              <span className="hidden sm:inline">I Understand, Enter Edit Mode</span>
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Version Control Education Modal */}
    {showEducationModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-2 border-blue-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="h-6 w-6 text-blue-500" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard Tips & Features
              </h3>
            </div>
            <p className="text-base text-muted-foreground">
              Learn how to use version control, tags, and Edit Mode
            </p>
          </div>

          <div className="space-y-4 mb-6 overflow-y-auto flex-1">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-base font-semibold text-blue-400 mb-2">
                When Your Files Change
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you update a file and want to create a new timestamped version, <strong>click the "New Version" button</strong> on your existing proof card. This keeps all versions together in one organized timeline.
              </p>
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-base font-semibold text-orange-400 mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                The "New Version" Button
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                You'll find this button on each proof card. It creates a new timestamped version linked to your original proof, even if the file contents changed.
              </p>
              <div className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 font-medium text-sm pointer-events-none opacity-75">
                <GitBranch size={16} />
                <span>New Version</span>
              </div>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-base font-semibold text-purple-400 mb-2">
                Why This Matters
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li>Earlier timestamps prove ownership before later ones</li>
                <li>Version history shows your work's evolution over time</li>
                <li>All versions stay organized in one proof card</li>
              </ul>
            </div>

            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-base font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Organizing with Tags
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Tags help you categorize and filter your proofs. Create tags for projects, clients, or any category that helps you stay organized.
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li>Click on any tag to add/remove it from a proof</li>
                <li>Tags apply to all versions in a proof group</li>
                <li>Create new tags on the fly or manage them in Edit Mode</li>
                <li>Filter your proofs by clicking tags in the sidebar</li>
              </ul>
            </div>

            <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
              <p className="text-base font-semibold text-pink-400 mb-2 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Mode Power Features
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Enable Edit Mode to access advanced features for managing multiple proofs at once:
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li><strong>Batch tag editing:</strong> Select multiple proofs and add/remove tags</li>
                <li><strong>Combine proofs:</strong> Merge separate proof cards into one version history</li>
                <li><strong>Move/Copy proofs:</strong> Transfer proofs between Personal Storage and Teams</li>
                <li><strong>Tag management:</strong> Create, rename, or delete tags</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Toggle Edit Mode using the switch at the top of your dashboard.
              </p>
            </div>

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <p className="text-base font-semibold text-indigo-400 mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Move & Copy Proofs
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Transfer proofs between your personal storage and team workspaces in Edit Mode:
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li><strong>Move:</strong> Relocate proofs to a different storage location (original is moved)</li>
                <li><strong>Copy:</strong> Create independent duplicates in another location (original remains)</li>
                <li>Choose to transfer just the <strong>latest version</strong> or <strong>full history</strong></li>
                <li>Tags that exist in the destination are automatically preserved</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Note: Team members can move within teams; only admins can move proofs out of teams.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-base font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Blockchain Anchoring
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Paid plan proofs are automatically anchored to the <strong>Bitcoin blockchain</strong> via OpenTimestamps, providing independently verifiable timestamps.
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li>Status shown on each proof card: Confirmed, Pending, or Not anchored</li>
                <li>Download .ots files from the Info modal for independent verification</li>
                <li>Verify at <strong>opentimestamps.org</strong> — no need to trust ProveChain</li>
              </ul>
            </div>

            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
              <p className="text-base font-semibold text-teal-400 mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Automated Proofs
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Connect cloud services (GitHub, OneDrive, Dropbox, Google Drive) and set up automations to generate proofs on a daily or weekly schedule.
              </p>
              <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                <li>Automated proofs are version-chained automatically</li>
                <li>Skips runs when nothing has changed (no duplicates)</li>
                <li>Manage from <strong>Connected Services</strong> in your user menu</li>
              </ul>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-base font-semibold text-green-400 mb-2">
                Need More Help?
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Check out the{' '}
                <Link
                  href="/dashboard/guide"
                  className="text-green-400 underline font-medium hover:text-green-700 hover:text-green-300"
                  onClick={() => {
                    localStorage.setItem('provechain_seen_version_education', 'true')
                    setShowEducationModal(false)
                  }}
                >
                  Dashboard Guide
                </Link>
                {' '}for a complete walkthrough of all features.
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => {
                localStorage.setItem('provechain_seen_version_education', 'true')
                setShowEducationModal(false)
              }}
              className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
            >
              Got It, Thanks!
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Move Proofs Modal */}
    {showMoveModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-2 border-blue-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3">
              Move Proofs
            </h3>
            <p className="text-base text-muted-foreground">
              Transfer {selectedProofIds.size} proof{selectedProofIds.size !== 1 ? 's' : ''} to a different location.
            </p>
          </div>

          <div className="space-y-4 mb-6 overflow-y-auto flex-1">
            {loadingTeams ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading destinations...
              </p>
            ) : (
              <>
                {/* Version Control Option */}
                {(() => {
                  const selectedProofs = activeProofs.filter(p => selectedProofIds.has(p.id))
                  const hasVersionControlled = selectedProofs.some(p => p.proof_group_id || p.parent_proof_id)

                  if (hasVersionControlled) {
                    return (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-base font-semibold text-purple-400 mb-3">
                          Version Control Options
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => setMoveVersionOption('latest')}
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              moveVersionOption === 'latest'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                moveVersionOption === 'latest'
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {moveVersionOption === 'latest' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">Latest Version Only</p>
                              <p className="text-xs text-muted-foreground">
                                Move only the selected versions
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => setMoveVersionOption('all')}
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              moveVersionOption === 'all'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                moveVersionOption === 'all'
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {moveVersionOption === 'all' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">Full Version History</p>
                              <p className="text-xs text-muted-foreground">
                                Move all versions in the proof groups
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Destination Selector */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-base font-semibold text-blue-400 mb-3">
                    Select Destination
                  </p>
                  <div className="space-y-2">
                    {/* Personal Storage Option */}
                    <button
                      onClick={() => setMoveDestination({ type: 'personal' })}
                      className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                        moveDestination?.type === 'personal'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          moveDestination?.type === 'personal'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {moveDestination?.type === 'personal' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <User className="w-5 h-5 text-blue-500" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">Personal Storage</p>
                        <p className="text-xs text-muted-foreground">
                          Only you can access these proofs
                        </p>
                      </div>
                    </button>

                    {/* Team Options */}
                    {availableTeams.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground font-medium">
                            OR MOVE TO A TEAM
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {availableTeams.map((team) => (
                          <button
                            key={team.team_id}
                            onClick={() =>
                              setMoveDestination({
                                type: 'team',
                                teamId: team.team_id,
                                teamName: team.team_name,
                              })
                            }
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              moveDestination?.type === 'team' && moveDestination.teamId === team.team_id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                moveDestination?.type === 'team' && moveDestination.teamId === team.team_id
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {moveDestination?.type === 'team' && moveDestination.teamId === team.team_id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <Users className="w-5 h-5 text-purple-500" />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{team.team_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {team.team_tier} • {team.user_role}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Permission Warning */}
                {proofFilter.type === 'team' && proofFilter.teamId && (() => {
                  const team = availableTeams.find(t => t.team_id === proofFilter.teamId)
                  if (team && team.user_role === 'member') {
                    return (
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-base font-semibold text-orange-400 mb-2">
                          ⚠️ Team Member Restrictions
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          As a team member, you can only move proofs <strong>within this team</strong> or <strong>into another team</strong>. You cannot move proofs out to personal storage. Only team admins can move proofs out of teams.
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* What Will Happen */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-base font-semibold text-green-400 mb-2">
                    What Will Happen
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Selected proofs will be transferred to the destination</li>
                    <li>Proofs will be removed from their current location</li>
                    <li>Tags will be copied if they exist in the destination</li>
                    <li>All metadata and proof data will be preserved</li>
                    {moveVersionOption === 'all' && (
                      <li><strong>All versions</strong> in the selected proof groups will be moved</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setShowMoveModal(false)
                setMoveDestination(null)
                setMoveVersionOption('latest')
              }}
              className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleMoveProofs}
              disabled={!moveDestination || movingProofs || loadingTeams}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all shadow-lg ${
                !moveDestination || movingProofs || loadingTeams
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {movingProofs ? 'Moving...' : 'Move Proofs'}
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Copy Proofs Modal */}
    {showCopyModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-2 border-green-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent mb-3">
              Copy Proofs
            </h3>
            <p className="text-base text-muted-foreground">
              Duplicate {selectedProofIds.size} proof{selectedProofIds.size !== 1 ? 's' : ''} to another location.
            </p>
          </div>

          <div className="space-y-4 mb-6 overflow-y-auto flex-1">
            {loadingTeams ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading destinations...
              </p>
            ) : (
              <>
                {/* Version Control Option */}
                {(() => {
                  const selectedProofs = activeProofs.filter(p => selectedProofIds.has(p.id))
                  const hasVersionControlled = selectedProofs.some(p => p.proof_group_id || p.parent_proof_id)

                  if (hasVersionControlled) {
                    return (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <p className="text-base font-semibold text-purple-400 mb-3">
                          Version Control Options
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={() => setCopyVersionOption('latest')}
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              copyVersionOption === 'latest'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                copyVersionOption === 'latest'
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {copyVersionOption === 'latest' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">Latest Version Only</p>
                              <p className="text-xs text-muted-foreground">
                                Copy only the selected versions
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => setCopyVersionOption('all')}
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              copyVersionOption === 'all'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                copyVersionOption === 'all'
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {copyVersionOption === 'all' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">Full Version History</p>
                              <p className="text-xs text-muted-foreground">
                                Copy all versions in the proof groups (creates independent copies)
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Destination Selector */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-base font-semibold text-green-400 mb-3">
                    Select Destination
                  </p>
                  <div className="space-y-2">
                    {/* Personal Storage Option */}
                    <button
                      onClick={() => setCopyDestination({ type: 'personal' })}
                      className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                        copyDestination?.type === 'personal'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          copyDestination?.type === 'personal'
                            ? 'border-green-500 bg-green-500'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {copyDestination?.type === 'personal' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <User className="w-5 h-5 text-blue-500" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">Personal Storage</p>
                        <p className="text-xs text-muted-foreground">
                          Only you can access these proofs
                        </p>
                      </div>
                    </button>

                    {/* Team Options */}
                    {availableTeams.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground font-medium">
                            OR COPY TO A TEAM
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {availableTeams.map((team) => (
                          <button
                            key={team.team_id}
                            onClick={() =>
                              setCopyDestination({
                                type: 'team',
                                teamId: team.team_id,
                                teamName: team.team_name,
                              })
                            }
                            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 transition-all ${
                              copyDestination?.type === 'team' && copyDestination.teamId === team.team_id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                copyDestination?.type === 'team' && copyDestination.teamId === team.team_id
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-muted-foreground/30'
                              }`}
                            >
                              {copyDestination?.type === 'team' && copyDestination.teamId === team.team_id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <Users className="w-5 h-5 text-purple-500" />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{team.team_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {team.team_tier} • {team.user_role}
                              </p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* What Will Happen */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-base font-semibold text-blue-400 mb-2">
                    What Will Happen
                  </p>
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                    <li>Duplicates of selected proofs will be created at the destination</li>
                    <li>Original proofs will remain in their current location</li>
                    <li>Tags will be copied if they exist in the destination</li>
                    <li>Each team can work on their copy independently</li>
                    {copyVersionOption === 'all' && (
                      <li><strong>All versions</strong> in the selected proof groups will be copied as independent groups</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setShowCopyModal(false)
                setCopyDestination(null)
                setCopyVersionOption('latest')
              }}
              className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyProofs}
              disabled={!copyDestination || copyingProofs || loadingTeams}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all shadow-lg ${
                !copyDestination || copyingProofs || loadingTeams
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {copyingProofs ? 'Copying...' : 'Copy Proofs'}
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Combine Proofs Modal */}
    {showCombineModal && combineData && (() => {
      const { proofs } = combineData

      // Get unique groups using the same logic as main grouping function
      const uniqueGroupKeys = new Set(proofs.map(p => {
        if (p.proof_group_id) {
          return p.proof_group_id
        } else if (p.parent_proof_id) {
          return p.proof_name || p.file_name
        } else {
          // Standalone proof - uses its own ID as groupKey
          return p.id
        }
      }))
      const totalVersions = Array.from(uniqueGroupKeys).reduce((sum, groupKey) => {
        const versions = proofGroups[groupKey] || []
        return sum + versions.length
      }, 0)

      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-orange-500/30 rounded-lg p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-3">
                ⚠️ Combine Proofs
              </h3>
              <p className="text-base text-muted-foreground">
                You're about to combine {uniqueGroupKeys.size} proof cards into one unified version history
              </p>
            </div>

            <div className="space-y-4 mb-6 overflow-y-auto flex-1">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-base font-semibold text-blue-400 mb-2">
                  What Will Happen
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                  This will combine <strong>{totalVersions} total versions</strong> from {uniqueGroupKeys.size} separate proof cards into a single chronological timeline.
                </p>
                <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                  <li>All versions will be sorted by creation timestamp (earliest to latest)</li>
                  <li>Versions will be <strong>renumbered from 1, 2, 3...</strong> in chronological order</li>
                  <li>Any gaps from deleted versions will be filled</li>
                  <li>Original version numbers will be replaced</li>
                </ul>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-base font-semibold text-orange-400 mb-2">
                      Selected Proofs
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {(() => {
                        // Group proofs by their group key to avoid duplicates
                        const uniqueGroups = new Map<string, { name: string; count: number; totalFiles: number }>()

                        proofs.forEach(p => {
                          // Use same grouping logic as main function
                          const groupKey = p.proof_group_id
                            ? p.proof_group_id
                            : p.parent_proof_id
                              ? (p.proof_name || p.file_name)
                              : p.id // Standalone proof
                          const versions = proofGroups[groupKey] || []
                          const totalFiles = p.proof_json?.total_files || Object.keys(p.proof_json?.file_hashes || {}).length

                          if (!uniqueGroups.has(groupKey)) {
                            uniqueGroups.set(groupKey, {
                              name: p.proof_name || p.file_name,
                              count: versions.length,
                              totalFiles: totalFiles
                            })
                          }
                        })

                        return Array.from(uniqueGroups.values()).map((group, idx) => (
                          <li key={idx}>
                            <strong>{group.name}</strong> — {group.totalFiles} files ({group.count} version{group.count !== 1 ? 's' : ''})
                          </li>
                        ))
                      })()}
                    </ul>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-base font-semibold text-red-400 mb-2">
                      ⚠️ THIS ACTION IS IRREVERSIBLE
                    </p>
                    <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                      <li>You cannot undo this operation</li>
                      <li>All versions will be combined and renumbered chronologically</li>
                      <li><strong>If you've deleted any versions</strong>, gaps will be filled by the combined versions</li>
                      <li>The separate proof cards will become one</li>
                      <li>You take full responsibility for this action</li>
                    </ul>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-3 font-semibold">
                      ProveChain is only responsible for storing hashes. We take no responsibility for misorganized proofs.
                    </p>
                  </div>
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowCombineModal(false)
                  setCombineData(null)
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
              >
                Cancel
              </button>
              <button
                  onClick={async () => {
                    setCombining(true)
                    try {
                      const response = await fetch('/api/proofs/combine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ proof_ids: combineData.proofIds }),
                      })

                      if (!response.ok) {
                        throw new Error('Failed to combine proofs')
                      }

                      // Refresh proofs list
                      await fetchProofs()
                      setShowCombineModal(false)
                      setCombineData(null)
                      setEditMode(false)
                      setSelectedProofIds(new Set())
                    } catch (error: any) {
                      console.error('Error combining proofs:', error)
                      setError(error.message)
                    } finally {
                      setCombining(false)
                    }
                  }}
                  disabled={combining}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-red-500 hover:bg-red-500/10 text-red-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {combining ? 'Combining...' : `Combine Into ${totalVersions} Versions`}
                </button>
            </div>
          </motion.div>
        </div>
      )
    })()}

      {/* Share Link Modal */}
      {shareModal.show && shareModal.proof && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShareModal({ show: false, proof: null, mode: 'file', shareUrl: null, loading: false })}
        >
          <div
            className="bg-card border-2 border-primary/30 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Share Proof
              </h3>
              <button
                onClick={() => setShareModal({ show: false, proof: null, mode: 'file', shareUrl: null, loading: false })}
                className="p-2 hover:bg-background/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const proofName = getRootProofMetadata(shareModal.proof).proof_name || shareModal.proof.file_name

              // Loading state (connected service auto-create)
              if (shareModal.loading && !shareModal.shareUrl) {
                return (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                    <p className="text-sm text-muted-foreground">Creating share link...</p>
                  </div>
                )
              }

              // Success — link generated
              if (shareModal.shareUrl) {
                const shareText = `I've shared a verified proof with you: "${proofName}". Click to verify:`
                const fullMessage = `${shareText}\n${shareModal.shareUrl}`
                const emailSubject = encodeURIComponent(`Proof Verification: ${proofName}`)
                const emailBody = encodeURIComponent(fullMessage)
                const whatsappText = encodeURIComponent(fullMessage)

                return (
                  <>
                    <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        {shareModal.mode === 'view' ? 'View-only' : 'Full verification'} link
                      </p>
                      <p className="text-sm font-mono text-cyan-400 break-all">{shareModal.shareUrl}</p>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <a
                        href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                      <a
                        href={`https://wa.me/?text=${whatsappText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={copyShareUrl}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                      <a
                        href={shareModal.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Link
                      </a>
                      <button
                        onClick={() => setShareModal({ show: false, proof: null, mode: 'file', shareUrl: null, loading: false })}
                        className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium text-sm transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )
              }

              // Mode picker (manual proofs only)
              return (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a verification link for <span className="text-foreground font-medium">{proofName}</span>
                  </p>

                  <div className="space-y-3 mb-6">
                    <label className="block text-sm font-medium mb-2">Verification Mode</label>
                    <button
                      onClick={() => setShareModal(prev => ({ ...prev, mode: 'view' }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        shareModal.mode === 'view'
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-border hover:border-cyan-500/30'
                      }`}
                    >
                      <Eye className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">View Only</p>
                        <p className="text-xs text-muted-foreground">Recipient can see proof details and verify against Bitcoin</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShareModal(prev => ({ ...prev, mode: 'file' }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        shareModal.mode === 'file'
                          ? 'border-cyan-500/50 bg-cyan-500/10'
                          : 'border-border hover:border-cyan-500/30'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Full Verification</p>
                        <p className="text-xs text-muted-foreground">Recipient can upload their file to verify the complete trust triangle</p>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={createShareLink}
                    disabled={shareModal.loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {shareModal.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    Create Share Link
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        onTagsUpdated={() => {
          fetchTags()
          fetchProofTags()
        }}
      />
    </>
  )
}
