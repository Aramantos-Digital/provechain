import { createClient, createDataClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { User } from '@supabase/supabase-js'

interface AuthContext {
  user: User
  supabase: ReturnType<typeof createDataClient>
}

/**
 * Get authenticated user context for API routes.
 *
 * Supports two auth methods:
 * 1. Cookie-based (web browser) — reads session from cookies
 * 2. Bearer token (CLI/API) — reads Authorization header
 *
 * Uses getUser() which validates the JWT via a network call to Core Supabase.
 * Returns null if the user is not authenticated.
 *
 * Usage:
 *   const auth = await getAuthContext()
 *   if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   const { user, supabase } = auth
 *   // supabase is the ProveChain data client (service role) — always filter by user.id
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const authClient = createClient()

  // Check for Bearer token (CLI/API auth)
  const headerStore = headers()
  const authHeader = headerStore.get('authorization')

  let user: User

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data, error } = await authClient.auth.getUser(token)
    if (error || !data.user) return null
    user = data.user
  } else {
    // Cookie-based auth (web browser)
    const { data, error } = await authClient.auth.getUser()
    if (error || !data.user) return null
    user = data.user
  }

  const supabase = createDataClient()
  return { user, supabase }
}
