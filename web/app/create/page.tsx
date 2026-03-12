'use client'

import { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Upload, Download, CheckCircle2, Loader2, Cloud, Check, Edit, GitBranch, LayoutDashboard, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { hashFiles, createProof, downloadProof, generateProofHash, type ProofData } from '@/lib/hasher'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import ProofDetailsModal, { type ProofDetailsData } from '@/components/ProofDetailsModal'
import { ProofDestinationModal, type ProofDestination } from '@/components/ProofDestinationModal'

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <CreatePageContent />
    </Suspense>
  )
}

function CreatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const versionOfParam = searchParams.get('versionOf')
  const proofNameParam = searchParams.get('proofName')
  const versionNotesParam = searchParams.get('versionNotes')
  const [activeTab, setActiveTab] = useState<'browser' | 'cli'>(
    tabParam === 'cli' ? 'cli' : 'browser'
  )
  const [isDragging, setIsDragging] = useState(false)
  const [isHashing, setIsHashing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [proof, setProof] = useState<ProofData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [savedProofId, setSavedProofId] = useState<string | null>(null)
  const [parentProof, setParentProof] = useState<any>(null)
  const [duplicateInfo, setDuplicateInfo] = useState<{ proofName: string; versionNumber: number } | null>(null)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [pendingFileAction, setPendingFileAction] = useState<(() => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [duplicateWarningData, setDuplicateWarningData] = useState<{ existingProofs: any[]; nextVersion: number } | null>(null)
  const [pendingProofData, setPendingProofData] = useState<{ proofData: any; fileList: File[] } | null>(null)
  const [inheritedDetails, setInheritedDetails] = useState<{ proof_name: string; description_title?: string; description_body?: string } | null>(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [showVersionNotesModal, setShowVersionNotesModal] = useState(false)
  const [showChooseParentModal, setShowChooseParentModal] = useState(false)
  const [selectedParentProof, setSelectedParentProof] = useState<any | null>(null)
  const [showDestinationModal, setShowDestinationModal] = useState(false)
  const [proofDestination, setProofDestination] = useState<ProofDestination>({ type: 'personal' })
  const [hasTeams, setHasTeams] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Fetch parent proof if creating a new version
  useEffect(() => {
    if (versionOfParam && isAuthenticated) {
      fetch(`/api/proofs?version_group_id=${versionOfParam}`)
        .then(res => res.ok ? res.json() : null)
        .then(result => {
          if (result?.data && result.data.length > 0) {
            setParentProof(result.data[0])
          }
        })
        .catch(err => console.error('Error fetching parent proof:', err))
    }
  }, [versionOfParam, isAuthenticated])

  // Pre-populate version notes from URL parameter
  useEffect(() => {
    if (versionNotesParam) {
      setVersionNotes(decodeURIComponent(versionNotesParam))
    }
  }, [versionNotesParam])

  // Check for teams on load (don't show modal yet)
  useEffect(() => {
    if (!isAuthenticated) return

    async function checkTeams() {
      try {
        const res = await fetch('/api/teams/options')
        if (!res.ok) return

        const data = await res.json()

        if (data && data.length > 0) {
          setHasTeams(true)

          // Pre-load last used filter from localStorage (don't show modal yet)
          const lastFilter = localStorage.getItem('provechain_last_proof_filter')
          if (lastFilter) {
            try {
              const filter = JSON.parse(lastFilter)
              setProofDestination(filter)
            } catch (e) {
              // Invalid JSON, default to personal
              setProofDestination({ type: 'personal' })
            }
          }
        }
      } catch (error) {
        console.error('Failed to check teams:', error)
      }
    }

    checkTeams()
  }, [isAuthenticated])

  // Auto-save proof when authentication completes (fixes race condition)
  useEffect(() => {
    if (isAuthenticated && proof && !saved && !isSaving && uploadedFiles.length > 0 && !showDuplicateWarning && !pendingProofData) {
      saveProofToDatabase(proof, uploadedFiles)
    }
  }, [isAuthenticated, proof, saved, isSaving, uploadedFiles, showDuplicateWarning, pendingProofData])

  // Reset form state completely (for "Create Another" button)
  const resetFormState = () => {
    setProof(null)
    setProgress({ current: 0, total: 0 })
    setSaved(false)
    setUploadedFiles([])
    setInheritedDetails(null)
    setDuplicateInfo(null)
    setVersionNotes('')
    setError(null)
    setSavedProofId(null)
    setParentProof(null)
    setShowDuplicateWarning(false)
    setDuplicateWarningData(null)
    setPendingProofData(null)
    setShowVersionNotesModal(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // Clear URL params to prevent re-population
    router.replace('/create')
  }

  const saveProofToDatabase = async (proofData: ProofData, fileList: File[]) => {
    if (!isAuthenticated) return

    setIsSaving(true)
    try {
      // Get the first file's info for metadata
      const firstFile = fileList[0]
      const defaultFileName = fileList.length === 1
        ? firstFile.name
        : (() => {
            // Try to extract a common folder name from file paths
            const paths = fileList.map(f => f.webkitRelativePath || f.name)
            const firstSegments = paths[0]?.split('/')
            if (firstSegments && firstSegments.length > 1) {
              // Files from a folder upload — use the top-level folder name
              return firstSegments[0]
            }
            return `${fileList.length} files`
          })()

      // Generate deterministic proof hash from file contents
      const fileHashArray = Object.entries(proofData.file_hashes).map(([path, hash]) => ({
        path,
        hash,
        size: fileList.find(f => (f.webkitRelativePath || f.name) === path)?.size || 0,
      }))
      const deterministicHash = await generateProofHash(fileHashArray)

      const { data: { user } } = await supabase.auth.getUser()

      // Check if this exact hash already exists IN THE SAME DESTINATION
      const duplicateParams = new URLSearchParams({ file_hash: deterministicHash })
      const duplicateRes = await fetch(`/api/proofs?${duplicateParams.toString()}`)
      let existingProofs: any[] | null = null
      if (duplicateRes.ok) {
        const duplicateData = await duplicateRes.json()
        const allDuplicates = duplicateData.data || []
        // Filter by destination: personal or specific team
        if (proofDestination.type === 'personal') {
          existingProofs = allDuplicates.filter((p: any) => !p.team_id)
        } else if (proofDestination.type === 'team' && proofDestination.teamId) {
          existingProofs = allDuplicates.filter((p: any) => p.team_id === proofDestination.teamId)
        } else {
          existingProofs = allDuplicates
        }
        // Sort by version_number descending
        existingProofs?.sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0))
      }

      // Check if duplicate exists
      if (existingProofs && existingProofs.length > 0) {
        // Duplicate hash detected! Show warning modal to user
        const latestProof = existingProofs[0]
        const nextVersionNumber = Math.max(...existingProofs.map(p => p.version_number || 1)) + 1

        // Store pending data - MUST set isSaving(false) BEFORE showing modal
        setIsSaving(false)
        setPendingProofData({ proofData, fileList })
        setDuplicateWarningData({ existingProofs: existingProofs, nextVersion: nextVersionNumber })
        setSelectedParentProof(latestProof) // Default to latest proof
        // Don't clear version notes if they came from URL params (New Version flow)
        if (!versionNotesParam) {
          setVersionNotes('')
        }
        setShowDuplicateWarning(true)
        return // Stop here - wait for user decision
      }

      // No duplicate (or coming from "New Version" flow) - proceed with save
      setDuplicateInfo(null)

      // Determine version data
      let versionData: any = {}
      if (versionOfParam && proofNameParam) {
        // Creating new version from "New Version" button
        const decodedProofName = decodeURIComponent(proofNameParam)

        const versionRes = await fetch(`/api/proofs?version_group_id=${encodeURIComponent(decodedProofName)}`)
        const versionResult = versionRes.ok ? await versionRes.json() : { data: [] }
        const existingVersions: any[] = versionResult.data || []

        const nextVersionNumber = existingVersions && existingVersions.length > 0
          ? Math.max(...existingVersions.map(v => v.version_number || 1)) + 1
          : 1

        // Get latest description fields (most recent version with descriptions)
        const versionWithDescription = existingVersions?.find(v => v.description_title || v.description_body)

        // Get earliest expires_at
        const expiresAtSorted = existingVersions
          ?.filter(v => v.expires_at)
          .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        const earliestExpiresAt = expiresAtSorted && expiresAtSorted.length > 0 ? expiresAtSorted[0].expires_at : null

        // Get proof_group_id from any existing version
        const proofGroupId = existingVersions?.[0]?.proof_group_id || null

        versionData = {
          parent_proof_id: versionOfParam,
          version_number: nextVersionNumber,
          proof_name: decodedProofName,
          description_title: versionWithDescription?.description_title || null,
          description_body: versionWithDescription?.description_body || null,
          proof_group_id: proofGroupId,
          inherit_expires_at: earliestExpiresAt,
        }

        // Store inherited details to pre-populate modal (for "New Version" flow)
        setInheritedDetails({
          proof_name: decodedProofName,
          description_title: versionWithDescription?.description_title || undefined,
          description_body: versionWithDescription?.description_body || undefined,
        })
      } else {
        // Fresh new proof - clear inherited details
        setInheritedDetails(null)
      }

      const response = await fetch('/api/proofs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: defaultFileName,
          file_hash: deterministicHash,
          file_size: fileList.reduce((acc, f) => acc + f.size, 0),
          timestamp: proofData.timestamp,
          proof_json: proofData,
          proof_name: versionData.proof_name || defaultFileName,
          description_title: versionData.description_title,
          description_body: versionData.description_body,
          parent_proof_id: versionData.parent_proof_id,
          version_number: versionData.version_number,
          proof_group_id: versionData.proof_group_id,
          inherit_expires_at: versionData.inherit_expires_at,
          version_notes: versionNotes || null,
          hash_version: 1,
          team_id: proofDestination.teamId || null,
          created_for: proofDestination.type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save proof')
      }

      const data = await response.json()
      setSavedProofId(data.proof?.id)
      setSaved(true)
    } catch (error: any) {
      console.error('Error saving proof:', error)
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDuplicateSave = async () => {
    if (!pendingProofData || !duplicateWarningData || !selectedParentProof) return

    // Require version notes when saving as a version
    if (!versionNotes || versionNotes.trim().length === 0) {
      setError('Version notes are required to maintain an audit trail. Please describe what changed or why you\'re creating this version.')
      return
    }

    setShowDuplicateWarning(false)
    setShowChooseParentModal(false)
    setIsSaving(true)

    try {
      const { proofData, fileList } = pendingProofData
      const { nextVersion } = duplicateWarningData
      const existingProof = selectedParentProof

      const firstFile = fileList[0]
      const defaultFileName = fileList.length === 1
        ? firstFile.name
        : (() => {
            // Try to extract a common folder name from file paths
            const paths = fileList.map(f => f.webkitRelativePath || f.name)
            const firstSegments = paths[0]?.split('/')
            if (firstSegments && firstSegments.length > 1) {
              // Files from a folder upload — use the top-level folder name
              return firstSegments[0]
            }
            return `${fileList.length} files`
          })()

      // Generate deterministic proof hash
      const fileHashArray = Object.entries(proofData.file_hashes).map(([path, hash]) => ({
        path,
        hash: hash as string,
        size: fileList.find(f => (f.webkitRelativePath || f.name) === path)?.size || 0,
      }))
      const deterministicHash = await generateProofHash(fileHashArray)

      const proofName = existingProof.proof_name || existingProof.file_name

      // Fetch all versions in this proof group to get earliest expires_at and latest descriptions
      const allVersionsRes = await fetch(`/api/proofs?version_group_id=${encodeURIComponent(proofName)}`)
      const allVersionsData = allVersionsRes.ok ? await allVersionsRes.json() : { data: [] }
      const allVersions: any[] = allVersionsData.data || []

      // Get earliest expires_at (nulls mean lifetime storage)
      const expiresAtSorted = allVersions
        ?.filter(v => v.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      const earliestExpiresAt = expiresAtSorted && expiresAtSorted.length > 0 ? expiresAtSorted[0].expires_at : null

      // Get latest description fields (most recent version with descriptions)
      const versionWithDescription = allVersions?.find(v => v.description_title || v.description_body)
      const inheritedDescriptionTitle = versionWithDescription?.description_title || existingProof.description_title || null
      const inheritedDescriptionBody = versionWithDescription?.description_body || existingProof.description_body || null

      // Set duplicate info for success message
      setDuplicateInfo({ proofName, versionNumber: nextVersion })

      // Store inherited details to pre-populate modal
      setInheritedDetails({
        proof_name: proofName,
        description_title: inheritedDescriptionTitle || undefined,
        description_body: inheritedDescriptionBody || undefined,
      })

      const response = await fetch('/api/proofs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: defaultFileName,
          file_hash: deterministicHash,
          file_size: fileList.reduce((acc, f) => acc + f.size, 0),
          timestamp: proofData.timestamp,
          proof_json: proofData,
          proof_name: proofName,
          description_title: inheritedDescriptionTitle,
          description_body: inheritedDescriptionBody,
          parent_proof_id: existingProof.id,
          version_number: nextVersion,
          proof_group_id: existingProof.proof_group_id || null,
          inherit_expires_at: earliestExpiresAt,
          version_notes: versionNotes || null,
          hash_version: 1,
          team_id: proofDestination.teamId || null,
          created_for: proofDestination.type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save proof')
      }

      const data = await response.json()
      setSavedProofId(data.proof?.id)
      setSaved(true)

      // Clear ALL pending data to prevent re-triggering
      setPendingProofData(null)
      setDuplicateWarningData(null)
      setUploadedFiles([]) // Clear uploaded files to prevent re-processing
    } catch (error: any) {
      console.error('Error saving duplicate proof:', error)
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const saveSeparately = async () => {
    if (!pendingProofData || !duplicateWarningData) return

    setShowDuplicateWarning(false)
    setIsSaving(true)

    try {
      const { proofData, fileList } = pendingProofData

      const firstFile = fileList[0]
      const defaultFileName = fileList.length === 1
        ? firstFile.name
        : (() => {
            // Try to extract a common folder name from file paths
            const paths = fileList.map(f => f.webkitRelativePath || f.name)
            const firstSegments = paths[0]?.split('/')
            if (firstSegments && firstSegments.length > 1) {
              // Files from a folder upload — use the top-level folder name
              return firstSegments[0]
            }
            return `${fileList.length} files`
          })()

      // Generate deterministic proof hash
      const fileHashArray = Object.entries(proofData.file_hashes).map(([path, hash]) => ({
        path,
        hash: hash as string,
        size: fileList.find(f => (f.webkitRelativePath || f.name) === path)?.size || 0,
      }))
      const deterministicHash = await generateProofHash(fileHashArray)

      // Inherit expiry timer from existing duplicate proof (prevents free tier abuse)
      const inheritExpiresAt = duplicateWarningData.existingProofs[0]?.expires_at || null

      const response = await fetch('/api/proofs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: defaultFileName,
          file_hash: deterministicHash,
          file_size: fileList.reduce((acc, f) => acc + f.size, 0),
          timestamp: proofData.timestamp,
          proof_json: proofData,
          // No parent_proof_id - this creates a new separate proof card
          version_number: 1,
          inherit_expires_at: inheritExpiresAt, // Inherit timer from existing duplicate
          hash_version: 1,
          team_id: proofDestination.teamId || null,
          created_for: proofDestination.type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save proof')
      }

      const data = await response.json()
      setSavedProofId(data.proof?.id)
      setSaved(true)

      // Clear ALL pending data to prevent re-triggering
      setPendingProofData(null)
      setDuplicateWarningData(null)
      setVersionNotes('')
      setUploadedFiles([]) // Clear uploaded files to prevent re-processing
    } catch (error: any) {
      console.error('Error saving proof separately:', error)
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelDuplicateSave = () => {
    setShowDuplicateWarning(false)
    setShowChooseParentModal(false)
    setPendingProofData(null)
    setDuplicateWarningData(null)
    setSelectedParentProof(null)
    setInheritedDetails(null)
    setVersionNotes('')
    setIsHashing(false)
    setProof(null)
    setProgress({ current: 0, total: 0 })
    setUploadedFiles([]) // Clear uploaded files
  }

  const handleSaveDetails = async (details: ProofDetailsData) => {
    if (!savedProofId) return

    try {
      const response = await fetch(`/api/proofs/${savedProofId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      })

      if (!response.ok) {
        throw new Error('Failed to update proof details')
      }

      setShowDetailsModal(false)
      // Optionally show success message
    } catch (error: any) {
      console.error('Error updating proof details:', error)
      setError(error.message)
    }
  }

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // If user has teams and modal hasn't been shown yet, show it first
    if (hasTeams && !showDestinationModal && proofDestination.type === 'personal' && !localStorage.getItem('provechain_last_proof_filter')) {
      setShowDestinationModal(true)
      setUploadedFiles(files)
      // Don't proceed yet - wait for modal confirmation
      return
    }

    setError(null)
    setIsHashing(true)
    setSaved(false)
    setProgress({ current: 0, total: files.length })
    setUploadedFiles(files)

    try {
      const fileHashes = await hashFiles(files, (current, total) => {
        setProgress({ current, total })
      })

      const proofData = createProof(fileHashes, 'ProveChain web snapshot')
      setProof(proofData)

      // Automatically save to database if authenticated
      if (isAuthenticated) {
        await saveProofToDatabase(proofData, files)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hash files')
    } finally {
      setIsHashing(false)
    }
  }, [isAuthenticated, hasTeams, showDestinationModal, proofDestination])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const items = Array.from(e.dataTransfer.items)
    const files: File[] = []

    items.forEach(item => {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    })

    handleFiles(files)
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [handleFiles])

  const handleFolderButtonClick = () => {
    setShowPrivacyModal(true)
  }

  const confirmPrivacyAndProceed = () => {
    setShowPrivacyModal(false)
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        {!proof && !isHashing && (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Create Your Proof</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate a cryptographic timestamp of your files in seconds
            </p>

            {/* Privacy Badge */}
            <div className="mt-6 inline-block px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="text-sm font-medium text-green-400 text-center">
                <svg className="w-4 h-4 text-green-500 inline-block align-middle mb-[3px] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                100% Private
                <svg className="w-4 h-4 text-green-500 inline-block align-middle mb-[3px] ml-2 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <br className="sm:hidden" />
                <span className="hidden sm:inline">. </span>Your files never leave your device
              </span>
            </div>

            {/* Immutability Warning */}
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
                <p className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Important: Preserve Your Original Files
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Each proof is locked to your file(s) <strong className="text-foreground">exactly as they exist right now</strong>.
                  If you modify a file, you&apos;ll need to create a new proof or version to cover the changes.
                  The original proof only verifies the original file. Without the original file, that proof cannot be verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Version Creation Banner */}
        {versionOfParam && proofNameParam && !proof && !isHashing && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border-2 border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GitBranch className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Creating New Version</p>
                  <p className="text-sm text-muted-foreground">
                    You're creating a new version of <span className="font-medium text-foreground">{decodeURIComponent(proofNameParam)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will create a new proof with the same name but a different hash for your updated files
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Browser/CLI Tabs */}
        {!proof && !isHashing && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('browser')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                  activeTab === 'browser'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Browser
              </button>
              <button
                onClick={() => setActiveTab('cli')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                  activeTab === 'cli'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                CLI
              </button>
            </div>
          </div>
        )}

        {/* Browser Tab - Upload Area */}
        {!proof && !isHashing && activeTab === 'browser' && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'max-w-2xl mx-auto border-2 border-dashed rounded-lg p-12 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Drop Files Here</h2>
            <p className="text-muted-foreground mb-6">
              Or click to select files from your computer
            </p>

            <div className="space-y-3">
              <label className="block">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
                <span className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 cursor-pointer">
                  Select Files
                </span>
              </label>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  // @ts-ignore - webkitdirectory is not in TS types
                  webkitdirectory="true"
                  directory="true"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  onClick={handleFolderButtonClick}
                  className="inline-flex items-center justify-center w-full px-6 py-3 border border-input text-base font-medium rounded-md text-foreground bg-background hover:bg-accent cursor-pointer"
                >
                  Select Folder
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-950/20 border border-red-900 rounded-md">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* CLI Tab - Instructions */}
        {!proof && !isHashing && activeTab === 'cli' && (
          <div className="max-w-2xl mx-auto border-2 border-dashed border-border rounded-lg p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Use the CLI Tool</h2>
              <p className="text-muted-foreground mb-6">
                Powerful command-line interface with beautiful terminal UI
              </p>
            </div>

            <div className="space-y-4 text-left bg-muted rounded-lg p-6">
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-sm font-semibold text-foreground mb-2">1. Install ProveChain</p>
                <code className="block bg-muted px-4 py-2 rounded text-sm font-mono text-primary">
                  npm install -g @aramantos/provechain-cli
                </code>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-sm font-semibold text-foreground mb-2">2. Initialize in your project</p>
                <code className="block bg-muted px-4 py-2 rounded text-sm font-mono text-primary">
                  provechain init
                </code>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-sm font-semibold text-foreground mb-2">3. Create your first proof</p>
                <code className="block bg-muted px-4 py-2 rounded text-sm font-mono text-primary">
                  provechain snapshot "Initial release"
                </code>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-400 mb-2">
                    ✅ 100% Local Processing
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All hashing happens on your device. Your files never leave your machine.
                  </p>
                </div>
                <a
                  href="/cli"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
                >
                  View Full CLI Documentation →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Hashing Progress */}
        {isHashing && (
          <div className="max-w-2xl mx-auto text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
            <h2 className="text-2xl font-semibold mb-2">Hashing Files...</h2>
            <p className="text-muted-foreground mb-6">
              Processing {progress.current} of {progress.total} files
            </p>

            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {proof && !isHashing && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className="relative inline-block"
              >
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                {/* Glistening star animation */}
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: 0 }}
                  animate={{
                    opacity: [0, 1, 1],
                    scale: [0, 1.5, 1.2],
                    rotate: [0, 360, 360]
                  }}
                  transition={{
                    duration: 2.5,
                    times: [0, 0.7, 1],
                    ease: "easeOut"
                  }}
                  className="absolute -top-2 -right-2 text-yellow-400 text-2xl"
                >
                  ✨
                </motion.div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold mb-2"
              >
                Proof Created!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground"
              >
                Your files have been cryptographically hashed
              </motion.p>
            </div>

            <div className="bg-card rounded-lg shadow-lg p-6 mb-6 border border-border">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Proof ID</label>
                  <p className="font-mono text-sm mt-1">{proof.proof_id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="font-mono text-sm mt-1">{proof.timestamp}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Files Hashed</label>
                  <p className="text-2xl font-bold mt-1">{proof.total_files}</p>
                </div>
              </div>
            </div>

            {/* Cloud Storage Status */}
            {isAuthenticated && saved && (
              <>
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-400">
                      Proof saved to your cloud storage!
                    </span>
                  </div>
                </div>

                {/* Duplicate Detection Notification */}
                {duplicateInfo && (
                  <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <GitBranch className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-400 text-balance text-center">
                        Duplicate detected! Created as version {duplicateInfo.versionNumber} of "{duplicateInfo.proofName}"
                      </span>
                    </div>
                  </div>
                )}

                {/* Immutability Warning */}
                <div className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-400 mb-2 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Keep Your Original Files Safe
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-center">
                    This proof is locked to these <strong className="text-foreground">exact file versions</strong>.
                    Do not modify or delete the originals. They are required to verify this proof.
                    Store them securely. For changes, create a "New Version" instead.
                  </p>
                </div>
              </>
            )}

            {isAuthenticated && isSaving && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                  <span className="text-sm font-medium text-green-400">
                    Saving to cloud...
                  </span>
                </div>
              </div>
            )}

            {/* Buttons - All on one row on large screens, stacked on small */}
            <div className="flex flex-col lg:flex-row gap-3 justify-center items-stretch lg:items-center w-full max-w-4xl mx-auto text-center">
              {isAuthenticated && saved && (
                <Link
                  href={savedProofId ? `/dashboard?new_proof=${savedProofId}` : '/dashboard'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-primary-foreground font-bold text-base shadow-lg transition-all w-full lg:w-auto"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  View Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )}

              <button
                onClick={() => downloadProof(proof)}
                className="inline-flex items-center justify-center px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-card hover:bg-accent transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Download JSON
              </button>

              <button
                onClick={resetFormState}
                className="inline-flex items-center justify-center px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-card hover:bg-accent transition-colors"
              >
                Create Another
              </button>

              {isAuthenticated && saved && (
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-primary hover:bg-primary/10 text-primary font-semibold text-base transition-all"
                >
                  <Edit className="h-5 w-5" />
                  Add Proof Details
                </button>
              )}

              {!isAuthenticated && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Cloud className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-400">
                      Want to save proofs to the cloud?
                    </span>
                  </div>
                  <Link href="/signup" className="text-sm text-blue-400 underline font-medium">
                    Sign up free →
                  </Link>
                </div>
              )}
            </div>

            {/* File Hashes Preview */}
            <div className="mt-8 bg-card rounded-lg shadow-lg p-6 border border-border">
              <h3 className="text-lg font-semibold mb-4">File Hashes (Preview)</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Object.entries(proof.file_hashes).slice(0, 10).map(([path, hash]) => (
                  <div key={path} className="text-sm">
                    <div className="font-medium truncate">{path}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{hash}</div>
                  </div>
                ))}
                {Object.keys(proof.file_hashes).length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    ... and {Object.keys(proof.file_hashes).length - 10} more files
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Proof Details Modal */}
      <ProofDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onSave={handleSaveDetails}
        defaultProofName={uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} files`}
        initialData={inheritedDetails || undefined}
      />

      {/* Proof Destination Modal */}
      <ProofDestinationModal
        isOpen={showDestinationModal}
        defaultSelection={proofDestination}
        onConfirm={(destination) => {
          setProofDestination(destination)
          setShowDestinationModal(false)
          // Save to localStorage for next time
          localStorage.setItem('provechain_last_proof_filter', JSON.stringify(destination))

          // If files are waiting to be processed, process them now
          if (uploadedFiles.length > 0 && !proof) {
            handleFiles(uploadedFiles)
          }
        }}
        onCancel={() => {
          // If user cancels and has teams, default to personal
          setProofDestination({ type: 'personal' })
          setShowDestinationModal(false)
          // Clear uploaded files if modal was cancelled
          setUploadedFiles([])
        }}
      />

      {/* Privacy Assurance Modal */}
      {showPrivacyModal && (
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
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrivacyAndProceed}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg"
              >
                <span className="hidden sm:inline">I Understand, Continue</span>
                <span className="sm:hidden">I Understand</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && duplicateWarningData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-yellow-500/30 rounded-lg p-6 max-w-xl w-full shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-3">
                ⚠️ {duplicateWarningData.existingProofs.length > 1 ? `${duplicateWarningData.existingProofs.length} Duplicates` : 'Duplicate'} Detected
              </h3>
              <p className="text-base text-muted-foreground">
                {duplicateWarningData.existingProofs.length > 1 ? (
                  <>You already have <strong className="text-foreground">{duplicateWarningData.existingProofs.length} proofs</strong> with this exact hash. This is unusual - having multiple duplicates may indicate you're not organizing proofs optimally. <Link href="/dashboard/guide" className="text-primary hover:underline">See our guide</Link> for best practices.</>
                ) : (
                  <>You already have a proof named <strong className="text-foreground">"{selectedParentProof?.proof_name || selectedParentProof?.file_name}"</strong> with this exact hash.</>
                )}
              </p>
            </div>

            <div className="space-y-4 mb-6 overflow-y-auto flex-1">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-base font-semibold text-blue-400 mb-2">
                  What Will Happen
                </p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>If you save this duplicate, it will be added as <strong>version {duplicateWarningData.nextVersion}</strong> to{duplicateWarningData.existingProofs.length > 1 ? ' one of your existing proofs' : ' your existing proof'}:</p>
                  {selectedParentProof && (
                    <div className="ml-3 space-y-1">
                      <p>• <strong>Proof Name:</strong> {selectedParentProof.proof_name || selectedParentProof.file_name}</p>
                      <p>• <strong>Original Created:</strong> {new Date(selectedParentProof.created_at).toLocaleDateString('en-IE')}</p>
                      <p>• <strong>Current Versions:</strong> v1-v{selectedParentProof.version_number}</p>
                    </div>
                  )}
                  {duplicateWarningData.existingProofs.length > 1 && (
                    <button
                      onClick={() => {
                        setShowDuplicateWarning(false)
                        setShowChooseParentModal(true)
                      }}
                      className="mt-2 px-3 py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-medium transition-all border border-blue-500/30"
                    >
                      Choose which proof to append to →
                    </button>
                  )}
                  <p className="mt-3 text-xs italic">You can edit the proof name or version details anytime from your dashboard.</p>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-base font-semibold text-yellow-400 mb-2">
                  Important: Earlier Timestamps Are More Valuable
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For proof of ownership, <strong>earlier timestamps are what matter</strong>. {selectedParentProof && (<>The timestamp from{' '}
                  <strong>{new Date(selectedParentProof.created_at).toLocaleDateString('en-IE')}</strong> proves
                  you owned these files on that date.</>)}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Creating another hash with today's timestamp doesn't strengthen your proof - it just creates a newer
                  version of the same files.
                </p>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-base font-semibold text-orange-400 mb-2">
                  When Should You Save a Duplicate?
                </p>
                <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                  <li>If you accidentally select an old folder rather than an updated version</li>
                  <li>If you want to create a redundant backup for some reason</li>
                  <li>If you're testing the system</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={cancelDuplicateSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {/* Only show "Save Separately" if NOT coming from "New Version" flow */}
              {!versionOfParam && (
                <button
                  onClick={saveSeparately}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 rounded-lg border-2 border-blue-500 hover:bg-blue-500/10 text-blue-400 font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Separately'}
                </button>
              )}
              <button
                onClick={() => {
                  // If version notes already exist (from "New Version" flow), save directly
                  if (versionNotes && versionNotes.trim().length > 0) {
                    confirmDuplicateSave()
                  } else {
                    // Otherwise, show version notes modal
                    setShowDuplicateWarning(false)
                    setShowVersionNotesModal(true)
                    setError(null) // Clear any previous errors
                  }
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-orange-500 hover:bg-orange-500/10 text-orange-400 font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : `Save as v${duplicateWarningData.nextVersion}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Version Notes Modal */}
      {showVersionNotesModal && duplicateWarningData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-purple-500/30 rounded-lg p-6 max-w-xl w-full shadow-2xl"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-3">
                <GitBranch className="inline-block h-6 w-6 mr-2 mb-1 text-purple-400" />
                Creating Version {duplicateWarningData.nextVersion}
              </h3>
              <p className="text-base text-muted-foreground">
                You're about to create <strong>version {duplicateWarningData.nextVersion}</strong> of <strong className="text-foreground">"{selectedParentProof?.proof_name || selectedParentProof?.file_name}"</strong>
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <label className="text-base font-semibold text-purple-400 mb-2 block">
                  Version Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={versionNotes}
                  onChange={(e) => {
                    setVersionNotes(e.target.value)
                    if (error) setError(null) // Clear error when user starts typing
                  }}
                  placeholder="Required: Describe what changed (e.g., 'Updated contract terms', 'Fixed typos', 'Added appendix B')..."
                  className="w-full px-3 py-2 rounded-lg bg-background border-2 border-purple-500/30 focus:border-purple-500 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Required for audit trail. You never know when a detailed version history will be critical.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVersionNotesModal(false)
                  setShowDuplicateWarning(true) // Go back to duplicate warning
                  setError(null)
                }}
                className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium transition-all"
              >
                Back
              </button>
              <button
                onClick={confirmDuplicateSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="inline-block h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Version {duplicateWarningData.nextVersion}</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Choose Parent Proof Modal */}
      {showChooseParentModal && duplicateWarningData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border-2 border-blue-500/30 rounded-lg p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
                Choose Which Proof to Append To
              </h3>
              <p className="text-base text-muted-foreground">
                You have {duplicateWarningData.existingProofs.length} proofs with this exact hash. Select which one you want to add this new version to:
              </p>
            </div>

            <div className="space-y-3 mb-6 overflow-y-auto flex-1">
              {duplicateWarningData.existingProofs.map((proof) => (
                <button
                  key={proof.id}
                  onClick={() => setSelectedParentProof(proof)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedParentProof?.id === proof.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border hover:border-blue-500/50 hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate mb-1">
                        {proof.proof_name || proof.file_name}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>Created: {new Date(proof.created_at).toLocaleDateString('en-IE')} at {new Date(proof.created_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</p>
                        <p>Version: v{proof.version_number}</p>
                        {proof.expires_at && (
                          <p className="text-yellow-400">
                            Expires: {new Date(proof.expires_at).toLocaleDateString('en-IE')}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedParentProof?.id === proof.id && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowChooseParentModal(false)
                  setShowDuplicateWarning(true)
                }}
                className="flex-1 px-4 py-3 rounded-lg frost-light border border-white/10 hover:frost-warm text-foreground font-medium transition-all"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setShowChooseParentModal(false)
                  setShowDuplicateWarning(true)
                }}
                disabled={!selectedParentProof}
                className="flex-1 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue with Selected Proof
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
