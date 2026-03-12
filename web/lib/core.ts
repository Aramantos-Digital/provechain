/**
 * Aramantos Core API client
 *
 * Validates user sessions and retrieves tier/product activation info
 * from the central Core API.
 */

const CORE_API_URL = process.env.CORE_API_URL!
const SERVICE_API_KEY = process.env.SERVICE_API_KEY!

export interface CoreUser {
  user_id: string
  email: string
  tier: string
  activated_products: string[]
  organization_id: string | null
  organization_role: string | null
}

interface ValidateTokenResponse {
  valid: boolean
  user_id?: string
  email?: string
  tier?: string
  activated_products?: string[]
  organization_id?: string | null
  organization_role?: string | null
  error?: string
}

/**
 * Validate a user's JWT against Core and get their tier + product activations.
 *
 * @param token - The user's Supabase JWT (from auth.getUser() or session)
 * @returns CoreUser object with user_id, email, tier, activated_products
 * @throws Error if validation fails or user doesn't have ProveChain activated
 */
export async function validateWithCore(token: string): Promise<CoreUser> {
  const response = await fetch(`${CORE_API_URL}/internal/validate-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': SERVICE_API_KEY,
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    throw new Error(`Core validation failed: ${response.status}`)
  }

  const data: ValidateTokenResponse = await response.json()

  if (!data.valid || !data.user_id) {
    throw new Error('Invalid token')
  }

  return {
    user_id: data.user_id,
    email: data.email || '',
    tier: data.tier || 'free',
    activated_products: data.activated_products || [],
    organization_id: data.organization_id || null,
    organization_role: data.organization_role || null,
  }
}

/**
 * Look up a user by email via Core API.
 * Used for in-app notifications when inviting team members.
 *
 * @param email - The email to look up
 * @returns User object with id and email, or null if not found
 */
export async function getUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  try {
    const response = await fetch(
      `${CORE_API_URL}/internal/user/by-email?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'X-Service-Key': SERVICE_API_KEY,
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data.found || !data.user) return null

    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
}

/**
 * Get user's effective tier for ProveChain from Core.
 *
 * @param userId - The user's UUID
 * @returns The user's tier string (e.g., 'free', 'professional', 'team', 'business')
 */
export async function getUserTier(userId: string): Promise<string> {
  const response = await fetch(
    `${CORE_API_URL}/internal/user/${userId}/tier?product=provechain`,
    {
      headers: {
        'X-Service-Key': SERVICE_API_KEY,
      },
    }
  )

  if (!response.ok) {
    return 'free'
  }

  const data = await response.json()
  return data.tier || 'free'
}

/**
 * Get a provider's decrypted access token from Core for a given user.
 * Used by cron jobs that need direct API access (e.g., automated GitHub proofs).
 *
 * @param userId - The user's UUID
 * @param provider - The provider slug (e.g., 'github', 'dropbox')
 * @returns The access token string, or null if not connected/available
 */
export async function getProviderToken(
  userId: string,
  provider: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${CORE_API_URL}/internal/credentials/${userId}/${provider}/token`,
      {
        headers: {
          'X-Service-Key': SERVICE_API_KEY,
          'X-Service-Id': 'provechain',
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    return data.access_token || null
  } catch {
    return null
  }
}

/**
 * Check if a provider is connected for a given user.
 *
 * @param userId - The user's UUID
 * @param provider - The provider slug
 * @returns Connection status object, or null if not connected
 */
export async function getCredentialStatus(
  userId: string,
  provider: string
): Promise<{ connected: boolean; status?: string; expired?: boolean } | null> {
  try {
    const response = await fetch(
      `${CORE_API_URL}/internal/credentials/${userId}/${provider}/status`,
      {
        headers: {
          'X-Service-Key': SERVICE_API_KEY,
        },
      }
    )

    if (!response.ok) return null

    return await response.json()
  } catch {
    return null
  }
}

export interface ProductActivation {
  product: string
  activated_at: string
  source: 'user' | 'organization'
}

/**
 * Get user's product activations from Core.
 *
 * @param userId - The user's UUID
 * @returns Array of product activations (both user-level and org-level)
 */
export async function getUserProducts(userId: string): Promise<ProductActivation[]> {
  try {
    const response = await fetch(
      `${CORE_API_URL}/internal/user/${userId}/products`,
      {
        headers: {
          'X-Service-Key': SERVICE_API_KEY,
        },
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.activations || []
  } catch {
    return []
  }
}
