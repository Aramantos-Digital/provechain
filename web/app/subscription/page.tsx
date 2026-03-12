'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Calendar, Check, AlertTriangle } from 'lucide-react'
import { getTierDisplayName, getTierColor } from '@/lib/tiers'
import Link from 'next/link'

type Subscription = {
  tier: string
  status: string
  created_at: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export default function SubscriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingAmount, setBillingAmount] = useState<number | null>(null)

  const TIER_PRICING: Record<string, number> = {
    'free': 0,
    'founding_member': 5,
    'professional': 9,
    'team': 100,
    'business': 250,
    'custom': 0
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  async function loadSubscription() {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        const subData = data.subscription as Subscription | null
        setSubscription(subData)
        if (subData) {
          setBillingAmount(TIER_PRICING[subData.tier] || 0)
        }
      } else {
        // No subscription or error — leave as null (free tier)
        setSubscription(null)
      }
    } catch (error: any) {
      console.error('Error loading subscription:', error)
      setError(error.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('Are you sure you want to cancel? Your plan will remain active until the end of your billing period.')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel plan')
      }

      // Reload subscription data
      await loadSubscription()
      alert('Plan cancelled. You\'ll retain access until the end of your billing period.')
    } catch (error: any) {
      console.error('Error cancelling plan:', error)
      setError(error.message || 'Failed to cancel plan')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-muted-foreground">Loading plan details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-16 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Subscription Management
          </h1>
          <button
            onClick={() => router.push('/settings')}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            ← Back to Settings
          </button>
        </div>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {subscription ? (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold">Current Plan</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan</p>
                <p className="text-3xl font-bold text-foreground">
                  {getTierDisplayName(subscription.tier)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span className="text-sm text-muted-foreground">
                  Status: <span className="text-foreground font-medium">Active</span>
                </span>
              </div>

              {subscription.current_period_end && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    Billing period ends: <span className="text-foreground font-medium">
                      {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </span>
                </div>
              )}

              {billingAmount != null && billingAmount > 0 && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                  <span className="text-sm text-muted-foreground">Monthly Billing:</span>
                  <span className="text-lg font-bold text-foreground">
                    {subscription.tier === 'team' || subscription.tier === 'business' || subscription.tier === 'custom'
                      ? `$${billingAmount}.00`
                      : `€${billingAmount}.00`
                    }
                  </span>
                </div>
              )}

              {subscription.cancel_at_period_end && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 bg-orange-900/20 border border-orange-200 border-orange-800 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  <span className="text-sm text-orange-800 text-orange-200">
                    Your plan is scheduled for cancellation at the end of the billing period.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plan Features */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Plan Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {subscription.tier === 'free' && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">CLI tool (unlimited)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Web UI (unlimited)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">24-hour cloud storage</span>
                  </div>
                </>
              )}

              {(subscription.tier === 'professional' || subscription.tier === 'founding_member') && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited cloud storage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Blockchain timestamping</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Proof history & analytics</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Priority support</span>
                  </div>
                </>
              )}

              {subscription.tier === 'team' && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Everything in Professional</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Team management (up to 5 members)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">1 team workspace</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Shared proof history</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Team-wide version control</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Collaborative tagging</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Member activity logs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Priority email support</span>
                  </div>
                </>
              )}

              {subscription.tier === 'business' && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Everything in Team</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Team management (up to 20 members)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Up to 3 team workspaces</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">API key management</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Programmatic proof creation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Webhook notifications</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Advanced analytics dashboard</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">99.9% uptime SLA</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Dedicated support (4hr response)</span>
                  </div>
                </>
              )}

              {subscription.tier === 'custom' && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Everything in Business</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited teams</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited API keys</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Custom integrations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">SSO & SAML support</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Custom SLA (up to 99.99%)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Dedicated account manager</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">On-premise deployment options</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Priority phone support</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upgrade Prompts */}
          {subscription.tier === 'professional' && (
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">Need Team Collaboration?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Team plan adds team management for up to 5 members at $100/month
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Shared proof workspaces</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Team-wide version control</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Collaborative workflows</span>
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                View Team Features
              </Link>
            </div>
          )}

          {subscription.tier === 'team' && (
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-3">Need API Access?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Business plan adds API keys and supports up to 20 members at $250/month
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Up to 3 team workspaces</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>API key management</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Programmatic proof creation</span>
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                View Business Features
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {subscription.tier !== 'custom' && (
                <Link
                  href="/upgrade"
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
                >
                  Upgrade Plan
                </Link>
              )}

              {subscription.tier !== 'custom' && !subscription.cancel_at_period_end && (
                <button
                  onClick={handleCancelSubscription}
                  className="block w-full px-4 py-3 text-center text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  Cancel Plan
                </button>
              )}

              {subscription.tier === 'custom' && (
                <p className="text-sm text-muted-foreground text-center">
                  To modify or cancel your custom plan, please contact{' '}
                  <a href="mailto:support@aramantos.dev" className="text-primary hover:underline">
                    support@aramantos.dev
                  </a>
                </p>
              )}

              {subscription.tier !== 'custom' && (
                <p className="text-xs text-muted-foreground text-center">
                  For billing inquiries, please contact{' '}
                  <a href="mailto:support@aramantos.dev" className="text-purple-400 hover:underline">
                    support@aramantos.dev
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No active subscription</p>
          <Link
            href="/upgrade"
            className="inline-block px-6 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-md"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  )
}
