import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { FileHash, ProofData } from './types.js'
import { generateProofHash } from './hasher.js'

const PROOFS_DIR = 'provechain/proofs'
const LEDGER_FILE = 'provechain/innovation_ledger.ndjson'

export function ensureProofsDir(projectRoot: string): string {
  const dir = join(projectRoot, PROOFS_DIR)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function createProof(
  projectRoot: string,
  fileHashes: FileHash[],
  skipped: number,
  description: string | null
): ProofData {
  const proofId = generateProofHash(fileHashes)
  const fileHashMap: Record<string, string> = {}

  for (const fh of fileHashes) {
    fileHashMap[fh.path] = fh.hash
  }

  return {
    proof_id: proofId,
    timestamp: new Date().toISOString(),
    description,
    project_root: projectRoot,
    total_files: fileHashes.length + skipped,
    files_processed: fileHashes.length,
    files_skipped: skipped,
    file_hashes: fileHashMap,
    files: fileHashes,
    hash_version: 1,
  }
}

export function saveProof(projectRoot: string, proof: ProofData): string {
  const dir = ensureProofsDir(projectRoot)
  const dateStr = proof.timestamp.replace(/:/g, '-').replace(/\./g, '-')
  const filename = `proof_${dateStr}.json`
  const filePath = join(dir, filename)

  writeFileSync(filePath, JSON.stringify(proof, null, 2), 'utf-8')
  return filePath
}

export function loadProof(filePath: string): ProofData {
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as ProofData
}

export function listProofs(projectRoot: string): { proof: ProofData; file: string }[] {
  const dir = join(projectRoot, PROOFS_DIR)

  if (!existsSync(dir)) return []

  const files = readdirSync(dir)
    .filter(f => f.startsWith('proof_') && f.endsWith('.json'))
    .sort()
    .reverse()

  return files.map(file => ({
    proof: loadProof(join(dir, file)),
    file,
  }))
}

export function logEvent(
  projectRoot: string,
  eventType: string,
  description: string,
  metadata?: Record<string, unknown>
): void {
  const ledgerPath = join(projectRoot, LEDGER_FILE)
  mkdirSync(join(projectRoot, 'provechain'), { recursive: true })

  const entry = {
    event_id: randomUUID(),
    timestamp: new Date().toISOString(),
    event_type: eventType,
    description,
    ...metadata,
  }

  const line = JSON.stringify(entry) + '\n'

  appendFileSync(ledgerPath, line, 'utf-8')
}
