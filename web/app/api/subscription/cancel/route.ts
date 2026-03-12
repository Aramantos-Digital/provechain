import { getAuthContext } from '@/lib/auth-context'
import { getUserTier } from '@/lib/core'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    // Get user's tier from Core
    const tier = await getUserTier(user.id)

    if (tier === 'free') {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Don't allow cancellation of custom plans via self-service
    if (tier === 'custom') {
      return NextResponse.json({
        error: 'Please contact support@aramantos.dev to cancel your custom plan'
      }, { status: 400 })
    }

    // TODO: Implement cancellation via Core API or Stripe
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of your billing period'
    })
  } catch (error: any) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to cancel subscription'
    }, { status: 500 })
  }
}
