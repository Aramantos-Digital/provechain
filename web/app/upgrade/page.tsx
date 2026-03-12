'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, Users, Building2, Briefcase, ArrowLeft, Crown } from 'lucide-react'
import { getTierDisplayName } from '@/lib/tiers'
import { toast } from 'sonner'

const TIER_ORDER = ['free', 'founding_member', 'professional', 'team', 'business', 'custom']

interface UpgradeTier {
  tier: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  priceId?: string
  icon: React.ElementType
  badge?: string
  ctaLink?: string
}

const allTiers: UpgradeTier[] = [
  {
    tier: 'founding_member',
    name: 'Founding Member',
    price: '€5',
    period: 'per month',
    description: 'Lock in this price forever. Limited to first 100 users.',
    features: [
      'Cloud proof storage',
      'Blockchain timestamping',
      'Proof history & analytics',
      'Email notifications',
      'Priority support',
      'Price locked forever',
    ],
    cta: 'Become a Founder',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FOUNDING_MEMBER,
    icon: Sparkles,
    badge: 'LIMITED: First 100 Only',
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: '€9',
    period: 'per month',
    description: 'For professional developers and freelancers.',
    features: [
      'Cloud proof storage',
      'Blockchain timestamping',
      'Proof history & analytics',
      'Email notifications',
      'Priority support',
      'JSON output for CI/CD',
    ],
    cta: 'Go Professional',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO,
    icon: Zap,
  },
  {
    tier: 'team',
    name: 'Team',
    price: '$100',
    period: 'per month',
    description: 'For teams needing shared proof management.',
    features: [
      'Everything in Professional',
      'Team management (up to 5)',
      'Shared proof history',
      'Team-wide version control',
      'Collaborative tagging',
    ],
    cta: 'Get Started',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
    icon: Users,
  },
  {
    tier: 'business',
    name: 'Business',
    price: '$250',
    period: 'per month',
    description: 'For larger teams needing API access.',
    features: [
      'Everything in Team',
      'Up to 20 members',
      'API key management',
      'Webhook notifications',
      'Advanced analytics',
    ],
    cta: 'Start Business',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
    icon: Building2,
  },
  {
    tier: 'custom',
    name: 'Custom',
    price: 'Custom',
    period: 'pricing',
    description: 'Enterprise solutions with unlimited scale.',
    features: [
      'Unlimited everything',
      'Custom integrations',
      'SLA guarantees',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    icon: Briefcase,
    ctaLink: 'mailto:provechain@aramantos.dev?subject=Custom Enterprise Plan',
  },
]

function UpgradePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (searchParams.get('reason') === 'tier') {
      toast.error('You do not have access to this page. Please upgrade to a paid plan to access these features.')
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadTier() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/upgrade')
        return
      }

      try {
        const res = await fetch('/api/subscription')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setCurrentTier(data.subscription?.tier || 'free')
        } else {
          if (!cancelled) setCurrentTier('free')
        }
      } catch {
        if (!cancelled) setCurrentTier('free')
      }

      if (!cancelled) setPageLoading(false)
    }

    loadTier()
    return () => { cancelled = true }
  }, [router])

  const currentTierIndex = TIER_ORDER.indexOf(currentTier || 'free')
  const availableUpgrades = allTiers.filter(t => TIER_ORDER.indexOf(t.tier) > currentTierIndex)

  const handleUpgrade = async (tier: UpgradeTier) => {
    if (tier.ctaLink) {
      window.location.href = tier.ctaLink
      return
    }

    if (!tier.priceId) return

    setLoading(tier.priceId)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: tier.priceId }),
      })

      if (response.status === 401) {
        router.push('/login?redirect=/upgrade')
        return
      }

      if (!response.ok) {
        toast.error('Failed to start checkout. Please try again.')
        return
      }

      const { url, error } = await response.json()
      if (error) {
        toast.error(`Checkout failed: ${error}`)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch {
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Upgrade Plan</h1>
            <p className="text-muted-foreground mt-1">
              Currently on{' '}
              <span className="font-medium text-foreground">
                {getTierDisplayName(currentTier)}
              </span>
            </p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {availableUpgrades.length === 0 ? (
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8 text-center">
            <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">You&apos;re on the highest plan</h2>
            <p className="text-muted-foreground">
              You&apos;re already on the {getTierDisplayName(currentTier)} plan. No upgrades available.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableUpgrades.map((tier, index) => {
              const Icon = tier.icon
              return (
                <motion.div
                  key={tier.tier}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 hover:border-primary/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Icon + Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{tier.name}</h3>
                          {tier.badge && (
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {tier.features.map(feature => (
                            <span
                              key={feature}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                            >
                              <Check className="h-3 w-3 text-primary" />
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div className="flex items-center gap-4 md:flex-col md:items-end flex-shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-bold">{tier.price}</span>
                        <span className="text-sm text-muted-foreground ml-1">/ {tier.period}</span>
                      </div>
                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={loading !== null}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                          loading === tier.priceId
                            ? 'opacity-50 cursor-wait'
                            : 'bg-purple-600 hover:bg-purple-700 text-primary-foreground shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loading === tier.priceId ? 'Loading...' : tier.cta}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradePageContent />
    </Suspense>
  )
}
