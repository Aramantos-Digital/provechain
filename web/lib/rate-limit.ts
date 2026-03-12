/**
 * Simple in-memory rate limiter for Next.js Edge Middleware
 *
 * Note: In-memory storage resets on serverless cold starts.
 * For production scale, consider Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (resets on cold start, but good enough for basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    const entries = Array.from(rateLimitStore.entries())
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
    lastCleanup = now
  }
}

export interface RateLimitConfig {
  maxRequests: number  // Max requests allowed in window
  windowMs: number     // Time window in milliseconds
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // No existing entry or window has reset
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }

  // Within window - check count
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Pre-configured rate limits for different endpoints
 */
export const RATE_LIMITS = {
  // API endpoints - generous but protective
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000  // 100 requests per minute
  },

  // Proof creation - more restrictive
  proofCreation: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000  // 30 proofs per hour
  },

  // Auth attempts - strict
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000  // 5 attempts per minute
  },

  // Checkout - very strict (prevent abuse)
  checkout: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000  // 10 checkouts per hour
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback
  return 'unknown'
}
