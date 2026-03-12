import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tier = await getUserTier(auth.user.id)
    return NextResponse.json({ tier })
  } catch (error: any) {
    console.error('Error fetching user tier:', error)
    return NextResponse.json({ tier: 'free' })
  }
}
