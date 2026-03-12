import { createHash } from 'crypto'
import { canonicalProofHash } from '@aramantos/crypto'
import tar from 'tar-stream'
import { createGunzip } from 'zlib'
import { Readable } from 'stream'

export interface GitHubRepoFile {
  path: string
  hash: string
  size: number
}

export interface GitHubRepoProof {
  proof_id: string
  timestamp: string
  repo_url: string
  repo_full_name: string
  commit_sha: string
  branch: string
  total_files: number
  total_size: number
  files: GitHubRepoFile[]
}

/**
 * Get the latest commit SHA for a repository
 */
export async function getLatestCommitSHA(
  owner: string,
  repo: string,
  branch: string,
  accessToken: string
): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to fetch commit: ${error.message || response.statusText}`)
  }

  const commit = await response.json()
  return commit.sha
}

/**
 * Download repository archive (tarball) from GitHub
 */
export async function downloadRepoArchive(
  owner: string,
  repo: string,
  ref: string,
  accessToken: string
): Promise<Buffer> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to download archive: ${error || response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Extract and hash files from a gzipped tarball
 */
export async function extractAndHashFiles(tarballBuffer: Buffer): Promise<GitHubRepoFile[]> {
  const files: GitHubRepoFile[] = []

  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const gunzip = createGunzip()

    extract.on('entry', (header, stream, next) => {
      // Skip directories
      if (header.type !== 'file') {
        stream.resume()
        next()
        return
      }

      // Remove the root directory from path (GitHub adds it)
      // e.g., "username-repo-abc123/src/file.ts" -> "src/file.ts"
      const pathParts = header.name.split('/')
      pathParts.shift() // Remove first element (root dir)
      const cleanPath = pathParts.join('/')

      // Skip empty paths (root directory entry)
      if (!cleanPath) {
        stream.resume()
        next()
        return
      }

      // Read file contents and hash
      const chunks: Buffer[] = []

      stream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        const fileBuffer = Buffer.concat(chunks)
        const hash = createHash('sha256').update(fileBuffer).digest('hex')

        files.push({
          path: cleanPath,
          hash,
          size: fileBuffer.length,
        })

        next()
      })

      stream.on('error', reject)
    })

    extract.on('finish', () => {
      // Sort files by path using byte-order for cross-platform determinism
      files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
      resolve(files)
    })

    extract.on('error', reject)
    gunzip.on('error', reject)

    // Pipe tarball through gunzip and tar extract
    const stream = Readable.from(tarballBuffer)
    stream.pipe(gunzip).pipe(extract)
  })
}

/**
 * Generate a cryptographic proof for a GitHub repository
 */
export async function generateGitHubProof(
  owner: string,
  repo: string,
  branch: string,
  accessToken: string
): Promise<GitHubRepoProof> {
  try {
    // 1. Get latest commit SHA
    const commitSHA = await getLatestCommitSHA(owner, repo, branch, accessToken)

    // 2. Download repository archive
    const tarball = await downloadRepoArchive(owner, repo, commitSHA, accessToken)

    // 3. Extract and hash all files
    const files = await extractAndHashFiles(tarball)

    // 4. Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)

    // 5. Generate proof ID using @aramantos/crypto WASM (single source of truth)
    const entries = files.map(f => ({ path: f.path, hash: f.hash }))
    const proofId = canonicalProofHash(JSON.stringify(entries))

    // 6. Create proof object
    const proof: GitHubRepoProof = {
      proof_id: proofId,
      timestamp: new Date().toISOString(),
      repo_url: `https://github.com/${owner}/${repo}`,
      repo_full_name: `${owner}/${repo}`,
      commit_sha: commitSHA,
      branch,
      total_files: files.length,
      total_size: totalSize,
      files,
    }

    return proof
  } catch (error: any) {
    console.error('Error generating GitHub proof:', error)
    throw new Error(`Failed to generate proof: ${error.message}`)
  }
}

/**
 * Check if repository has changed since last proof
 */
export async function hasRepoChanged(
  owner: string,
  repo: string,
  branch: string,
  lastCommitSHA: string | null,
  accessToken: string
): Promise<{ changed: boolean; currentSHA: string }> {
  const currentSHA = await getLatestCommitSHA(owner, repo, branch, accessToken)

  return {
    changed: currentSHA !== lastCommitSHA,
    currentSHA,
  }
}
