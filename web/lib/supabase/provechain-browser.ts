import { PostgrestClient } from '@supabase/postgrest-js'
import { PROXY_COOKIE_NAME } from '@/lib/auth/proxy-jwt'

function getProxyToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${PROXY_COOKIE_NAME}=([^;]+)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

let cachedClient: PostgrestClient | null = null
let cachedToken: string | null = null

/**
 * Create (or reuse) a PostgREST client for browser-side ProveChain data queries.
 *
 * Uses the proxy JWT (set by middleware, no `kid` header) to authenticate
 * directly against ProveChain's PostgREST. This bypasses the slow API route
 * proxy and restores ~100ms query times.
 *
 * Uses PostgREST directly instead of a full Supabase client to avoid
 * creating a second GoTrueClient instance in the browser.
 */
export function createProveChainBrowserClient() {
  const token = getProxyToken()

  if (cachedClient && token === cachedToken) return cachedClient

  cachedToken = token
  cachedClient = new PostgrestClient(
    `${process.env.NEXT_PUBLIC_PROVECHAIN_SUPABASE_URL!}/rest/v1`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_PROVECHAIN_SUPABASE_ANON_KEY!,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )

  return cachedClient
}
