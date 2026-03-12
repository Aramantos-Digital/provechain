import { getValidSession } from './auth.js'
import type { ProofData } from './types.js'

const DEFAULT_API_URL = 'https://provechain.aramantos.dev'

function getApiUrl(): string {
  return process.env.PROVECHAIN_API_URL || DEFAULT_API_URL
}

export async function syncProof(proof: ProofData): Promise<{
  success: boolean
  proofId?: string
  error?: string
}> {
  const session = await getValidSession()
  if (!session) {
    return { success: false, error: 'Not logged in. Run "provechain login" first.' }
  }

  const apiUrl = getApiUrl()
  const proofJson = {
    file_hashes: proof.file_hashes,
    files: proof.files,
    files_processed: proof.files_processed,
    files_skipped: proof.files_skipped,
    total_files: proof.total_files,
  }

  const body = {
    file_name: `cli-snapshot-${proof.timestamp}`,
    file_hash: proof.proof_id,
    timestamp: proof.timestamp,
    proof_json: proofJson,
    file_size: JSON.stringify(proofJson).length,
    proof_name: proof.description || `CLI Snapshot`,
    description: proof.description || null,
    hash_version: proof.hash_version || 1,
  }

  const res = await fetch(`${apiUrl}/api/proofs/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    return { success: false, error: data.error || `HTTP ${res.status}` }
  }

  return { success: true, proofId: data.proof?.id }
}

export async function getCloudStatus(): Promise<{
  success: boolean
  email?: string
  userId?: string
  tier?: string
  proofCount?: number
  error?: string
}> {
  const session = await getValidSession()
  if (!session) {
    return { success: false, error: 'Not logged in' }
  }

  const apiUrl = getApiUrl()

  const res = await fetch(`${apiUrl}/api/subscription`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    return {
      success: true,
      email: session.user.email,
      userId: session.user.id,
    }
  }

  const data = await res.json()

  return {
    success: true,
    email: session.user.email,
    userId: session.user.id,
    tier: data.tier || data.subscription?.tier,
  }
}
