import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    const tier = await getUserTier(user.id)

    return NextResponse.json({
      success: true,
      subscription: {
        user_id: user.id,
        tier,
        status: 'active',
      },
    })
  } catch (error: any) {
    console.error('Error in subscription API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
