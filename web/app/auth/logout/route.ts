import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', request.url))
}
