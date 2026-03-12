/**
 * JS shim for @aramantos/crypto — used by webpack (Next.js) because
 * the WASM binary uses externref tables that webpack 5 cannot parse.
 *
 * Implements the same canonical proof hash algorithm as the Rust WASM.
 * Algorithm: sort entries by path (byte-order), join as "path:hash\n", SHA-256.
 *
 * Once Core rebuilds the WASM with -C target-feature=-reference-types,
 * this shim can be removed and the real package used directly.
 */
import { createHash } from 'crypto'

export function canonicalProofHash(entriesJson: string): string {
  const entries = JSON.parse(entriesJson) as { path: string; hash: string }[]
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const manifest = entries.map((e) => `${e.path}:${e.hash}`).join('\n')
  return createHash('sha256').update(manifest).digest('hex')
}
