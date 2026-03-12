import { SignJWT, jwtVerify } from 'jose'

const SHARED_SECRET = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
const PROXY_TOKEN_LIFETIME = 3600 // 1 hour

/**
 * Mint a proxy JWT for ProveChain's Supabase.
 *
 * Why: Core's GoTrue issues JWTs with a project-specific `kid` header.
 * ProveChain's PostgREST rejects these because it can't find the `kid`
 * in its own key registry. By minting a new JWT WITHOUT `kid`, PostgREST
 * falls back to direct signature verification against the shared secret.
 *
 * Security: The `sub` claim (user UUID) is copied from the verified Core JWT.
 * Only minimal claims are included (least privilege). The proxy JWT is
 * signed with the same HS256 secret that all Supabase projects share.
 */
export async function mintProxyJWT(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'aramantos-core-proxy',
    iat: now,
    exp: now + PROXY_TOKEN_LIFETIME,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }) // No kid
    .sign(SHARED_SECRET)
}

/**
 * Verify a Core JWT locally using the shared secret.
 * Returns the payload if valid, null if invalid/expired.
 *
 * This is used by middleware to verify the Core session before minting
 * a proxy JWT. No network call — pure local cryptographic verification.
 */
export async function verifyCoreJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SHARED_SECRET, {
      algorithms: ['HS256'],
    })
    if (!payload.sub) return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

export const PROXY_COOKIE_NAME = 'sb-provechain-proxy-token'
