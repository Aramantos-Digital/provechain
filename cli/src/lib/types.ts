export interface ProveChainConfig {
  include_extensions: string[]
  ignore_paths: string[]
}

export interface FileHash {
  path: string
  hash: string
  size: number
}

export interface ProofData {
  proof_id: string
  timestamp: string
  description: string | null
  project_root: string
  total_files: number
  files_processed: number
  files_skipped: number
  file_hashes: Record<string, string>
  files: FileHash[]
  hash_version: number
}

export interface VerifyResult {
  proof_id: string
  timestamp: string
  matches: number
  mismatches: number
  missing: number
  new_files: number
  total_files: number
  match_percentage: number
  mismatch_details: { path: string; expected: string; actual: string }[]
  missing_files: string[]
  new_file_list: string[]
}

export interface DiffResult {
  added: string[]
  removed: string[]
  modified: string[]
  unchanged: number
}

export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
  }
}
