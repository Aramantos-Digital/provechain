import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { mintProxyJWT, PROXY_COOKIE_NAME } from '@/lib/auth/proxy-jwt'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Mint a proxy JWT for direct browser → ProveChain Supabase queries.
    // This JWT omits the `kid` header so PostgREST falls back to direct
    // signature verification against the shared HS256 secret.
    const proxyToken = await mintProxyJWT(user.id)
    supabaseResponse.cookies.set({
      name: PROXY_COOKIE_NAME,
      value: proxyToken,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
    })
  } else {
    // Clear stale proxy cookie when not authenticated
    supabaseResponse.cookies.set({
      name: PROXY_COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
    })
  }

  return supabaseResponse
}
