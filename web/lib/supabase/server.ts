import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Create auth client pointing at Core's Supabase
 * Used for: auth.getUser(), session management
 * Points at: Aramantos Core Supabase project
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create data client pointing at ProveChain's own Supabase
 * Uses service role key to bypass RLS — all authorization is enforced at the API level
 * Points at: ProveChain Supabase project (proofs, tags, teams, etc.)
 *
 * IMPORTANT: Every query using this client MUST be scoped by user_id.
 * Missing a user_id filter is a critical data leak bug.
 */
export function createDataClient() {
  return createSupabaseClient(
    process.env.PROVECHAIN_SUPABASE_URL!,
    process.env.PROVECHAIN_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * @deprecated Use createDataClient() for data queries instead.
 * This was the old admin client that pointed at the same Supabase as auth.
 * Kept temporarily for backward compatibility during migration.
 */
export function createAdminClient() {
  return createDataClient()
}
