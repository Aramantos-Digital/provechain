import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit'

// Allowed origins for cross-origin API requests (e.g. TimeAnchor integration)
const CORS_ALLOWED_ORIGINS = [
  'https://timeanchor.aramantos.dev',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null) {
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const clientIP = getClientIP(request)

  // Handle CORS preflight for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(request.headers.get('origin'))
    if (corsHeaders) {
      return new NextResponse(null, { status: 204, headers: corsHeaders })
    }
    return new NextResponse(null, { status: 204 })
  }

  // Apply rate limiting to API routes (skip in development)
  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev && pathname.startsWith('/api/')) {
    let rateLimitConfig = RATE_LIMITS.api

    // Stricter limits for specific endpoints
    if (pathname === '/api/proofs/create') {
      rateLimitConfig = RATE_LIMITS.proofCreation
    } else if (pathname === '/api/checkout') {
      rateLimitConfig = RATE_LIMITS.checkout
    } else if (pathname.startsWith('/api/auth')) {
      rateLimitConfig = RATE_LIMITS.auth
    }

    const rateLimitKey = `${clientIP}:${pathname}`
    const result = checkRateLimit(rateLimitKey, rateLimitConfig)

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please slow down and try again later',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }
  }

  // Continue with session handling
  const response = await updateSession(request)

  // Add CORS headers to API responses
  if (pathname.startsWith('/api/')) {
    const corsHeaders = getCorsHeaders(request.headers.get('origin'))
    if (corsHeaders) {
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
