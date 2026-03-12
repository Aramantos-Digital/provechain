/**
 * Client-side file hashing using Web Crypto API
 * SHA-256 hashing for code authorship proofs
 */

export interface FileHash {
  path: string
  hash: string
  size: number
}

export interface ProofData {
  proof_id: string
  timestamp: string
  description?: string
  total_files: number
  file_hashes: Record<string, string>
}

/**
 * Compute SHA-256 hash of a file using Web Crypto API
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Hash multiple files and return results
 */
export async function hashFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<FileHash[]> {
  const results: FileHash[] = []
  const startTime = Date.now()
  const MIN_DURATION = 3000 // Minimum 3 seconds for visual feedback

  // Calculate delay per file to reach minimum duration
  const delayPerFile = files.length > 0 ? MIN_DURATION / files.length : 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const hash = await hashFile(file)

    results.push({
      path: file.webkitRelativePath || file.name,
      hash,
      size: file.size,
    })

    if (onProgress) {
      onProgress(i + 1, files.length)
    }

    // Add proportional delay to reach minimum duration
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayPerFile))
    }
  }

  // Ensure we hit the minimum duration
  const elapsed = Date.now() - startTime
  if (elapsed < MIN_DURATION) {
    await new Promise(resolve => setTimeout(resolve, MIN_DURATION - elapsed))
  }

  return results
}

/**
 * Generate a deterministic hash for a proof based on file contents.
 * Canonical algorithm: sort by path (byte-order), join as "path:hash\n", SHA-256.
 * Matches @aramantos/crypto WASM — using Web Crypto API for browser compatibility.
 */
export async function generateProofHash(fileHashes: FileHash[]): Promise<string> {
  const entries = fileHashes.map(({ path, hash }) => ({
    path: path.replace(/\\/g, '/'),
    hash,
  }))
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const manifest = entries.map((e) => `${e.path}:${e.hash}`).join('\n')
  const buffer = new TextEncoder().encode(manifest)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a proof JSON object from file hashes
 */
export function createProof(
  fileHashes: FileHash[],
  description?: string
): ProofData {
  const timestamp = new Date().toISOString().replace('+00:00', 'Z')
  const proof_id = crypto.randomUUID()

  const file_hashes: Record<string, string> = {}
  fileHashes.forEach(({ path, hash }) => {
    // Normalize path to use forward slashes
    const normalizedPath = path.replace(/\\/g, '/')
    file_hashes[normalizedPath] = hash
  })

  return {
    proof_id,
    timestamp,
    description,
    total_files: fileHashes.length,
    file_hashes,
  }
}

/**
 * Download proof as JSON file
 */
export function downloadProof(proof: ProofData) {
  const json = JSON.stringify(proof, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const filename = `proof_${proof.timestamp.replace(/:/g, '-').replace(/\./g, '-')}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
