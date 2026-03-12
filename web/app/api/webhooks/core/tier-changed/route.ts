import { NextRequest, NextResponse } from 'next/server'
import { applyTierChange } from '@/lib/tier-effects'

/**
 * Webhook receiver for Core tier change events.
 *
 * Currently Core does NOT fire this webhook (ProveChain handles tier effects
 * in the Stripe webhook after the Core upsert response). This endpoint exists
 * as a fallback if Core ever needs to push tier changes directly.
 *
 * Contract:
 *   POST /api/webhooks/core/tier-changed
 *   Authorization: Bearer {CORE_WEBHOOK_SECRET}
 *   Body: { event, user_id, product, previous_tier, new_tier }
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.CORE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('CORE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, user_id, previous_tier, new_tier } = body

    if (event !== 'tier.changed' || !user_id || !new_tier) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const result = await applyTierChange(user_id, previous_tier || 'free', new_tier)

    return NextResponse.json({ received: true, ...result })
  } catch (error: any) {
    console.error('Error processing tier change webhook:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
