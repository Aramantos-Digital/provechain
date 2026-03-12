import { createHash } from 'crypto'
import { canonicalProofHash } from '@aramantos/crypto'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import type { FileHash, ProveChainConfig } from './types.js'

/**
 * Compute SHA-256 hash of a file
 */
export function hashFile(filePath: string): string {
  const buffer = readFileSync(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Walk directory and hash all matching files
 */
export function hashFiles(
  projectRoot: string,
  config: ProveChainConfig,
  onProgress?: (current: number, total: number, path: string) => void
): { hashes: FileHash[]; skipped: number } {
  const hashes: FileHash[] = []
  let skipped = 0

  const extensionSet = new Set(config.include_extensions)
  const ignoreSet = new Set(config.ignore_paths)

  function walk(dir: string) {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      // Skip ignored paths
      const relPath = relative(projectRoot, join(dir, entry))
      const topLevel = relPath.split(/[/\\]/)[0]
      if (ignoreSet.has(topLevel) || ignoreSet.has(entry)) {
        continue
      }

      // Skip hidden files/folders
      if (entry.startsWith('.')) {
        continue
      }

      const fullPath = join(dir, entry)
      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        skipped++
        continue
      }

      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase()
        if (!extensionSet.has(ext)) {
          skipped++
          continue
        }

        try {
          const hash = hashFile(fullPath)
          // Normalize path to forward slashes
          const normalizedPath = relative(projectRoot, fullPath).replace(/\\/g, '/')

          hashes.push({
            path: normalizedPath,
            hash,
            size: stat.size,
          })

          if (onProgress) {
            onProgress(hashes.length, 0, normalizedPath)
          }
        } catch {
          skipped++
        }
      }
    }
  }

  walk(projectRoot)

  // Sort by path using byte-order for cross-platform determinism
  // Canonical algorithm matching @aramantos/crypto Rust lib
  hashes.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

  return { hashes, skipped }
}

/**
 * Generate deterministic proof hash from file hashes.
 * Uses @aramantos/crypto WASM for the canonical algorithm.
 */
export function generateProofHash(fileHashes: FileHash[]): string {
  const entries = fileHashes.map(({ path, hash }) => ({ path, hash }))
  return canonicalProofHash(JSON.stringify(entries))
}
