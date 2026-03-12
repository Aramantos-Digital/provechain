'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Sparkles, Zap, Shield, Users, Building2, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  popular?: boolean
  priceId?: string
  icon: React.ElementType
  badge?: string
  ctaLink?: string
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '€0',
    period: 'forever',
    description: 'Perfect for personal projects and open source',
    features: [
      'CLI tool (unlimited)',
      'Web UI (unlimited)',
      'Local hashing only',
      'Generate JSON proofs',
      'SHA-256 file hashing',
      '24-hour cloud storage',
      'MIT licensed',
    ],
    cta: 'Get Started',
    icon: Shield,
  },
  {
    name: 'Founding Member',
    price: '€5',
    period: 'per month',
    description: 'Lock in this price forever. Limited to first 100 users.',
    features: [
      'Everything in Free',
      'Cloud proof storage',
      'Blockchain timestamping',
      'Proof history & analytics',
      'Email notifications',
      'Priority support',
      'Price locked forever ✨',
    ],
    cta: 'Become a Founder',
    popular: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FOUNDING_MEMBER,
    icon: Sparkles,
    badge: 'LIMITED: First 100 Only',
  },
  {
    name: 'Professional',
    price: '€9',
    period: 'per month',
    description: 'For professional developers and freelancers',
    features: [
      'Everything in Free',
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
]

const enterpriseTiers: PricingTier[] = [
  {
    name: 'Team',
    price: '$100',
    period: 'per month',
    description: 'For teams needing shared proof management',
    features: [
      'Everything in Professional',
      'Team management (up to 5 members)',
      '1 team workspace',
      'Shared proof history',
      'Team-wide version control',
      'Collaborative tagging',
      'Member activity logs',
      'Priority support',
    ],
    cta: 'Get Started',
    icon: Users,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  },
  {
    name: 'Business',
    price: '$250',
    period: 'per month',
    description: 'For larger teams needing API access',
    features: [
      'Everything in Startup',
      'Team management (up to 20 members)',
      'Up to 3 team workspaces',
      'API key management',
      'Programmatic proof creation',
      'Webhook notifications',
      'Advanced analytics',
      'Dedicated support',
    ],
    cta: 'Start Business',
    icon: Building2,
    popular: true,
    badge: 'Most Popular for Enterprise',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID,
  },
  {
    name: 'Custom',
    price: 'Custom',
    period: 'pricing',
    description: 'Enterprise solutions with unlimited scale',
    features: [
      'Everything in Business',
      'Unlimited teams',
      'Unlimited members',
      'Unlimited API keys',
      'Custom integrations',
      'SLA guarantees',
      'Dedicated account manager',
      'On-premise deployment options',
    ],
    cta: 'Contact Sales',
    icon: Briefcase,
    ctaLink: 'mailto:support@aramantos.dev?subject=Custom Enterprise Plan',
  },
]

const individualFAQs = [
  {
    q: "What's the difference between Free and Paid tiers?",
    a: 'The Free tier gives you unlimited access to our CLI and Web UI for local hashing. Paid tiers add cloud storage, blockchain timestamping, and proof history tracking.',
  },
  {
    q: 'What is "Founding Member" pricing?',
    a: 'The first 100 users who subscribe get €5/month pricing locked in forever. Even as we add features and raise prices, Founding Members keep their €5 rate for life.',
  },
  {
    q: 'Are there usage limits?',
    a: 'Pro tier includes unlimited cloud storage with fair use (~100 proofs/month is typical). Need more? Email us - we\'re flexible for genuine use cases.',
  },
  {
    q: 'Do you store my files?',
    a: 'No. We only store cryptographic hashes (SHA-256) of your files, never the files themselves. Your files stay on your machine.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel your subscription anytime from your account dashboard. You\'ll still have access until the end of your billing period.',
  },
]

const enterpriseFAQs = [
  {
    q: 'What team sizes do you support?',
    a: 'Startup (5 members), Business (25 members), Custom (unlimited). All tiers can scale as your organization grows.',
  },
  {
    q: 'How does team collaboration work?',
    a: 'Team members can share proof history, collaborate on workflows, and access a unified dashboard. Perfect for teams managing proofs together.',
  },
  {
    q: 'What kind of support do enterprise customers get?',
    a: 'Startup gets priority support. Business gets a dedicated support channel with SLA guarantees. Custom gets a dedicated account manager and custom SLAs.',
  },
  {
    q: 'Can you build custom features for our organization?',
    a: 'Yes. Enterprise tier includes custom feature development tailored to your specific needs. We work closely with you to build what matters most.',
  },
  {
    q: 'What does "Future-ready roadmap access" mean?',
    a: 'Enterprise customers get early access to upcoming features (like RBAC, SSO, compliance certifications) and influence our product roadmap based on their needs.',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'individual' | 'enterprise'>('individual')
  const [loading, setLoading] = useState<string | null>(null)

  const currentTiers = activeTab === 'individual' ? tiers : enterpriseTiers
  const currentFAQs = activeTab === 'individual' ? individualFAQs : enterpriseFAQs

  const handleCheckout = async (tier: PricingTier) => {
    // Handle external link (Contact Sales)
    if (tier.ctaLink) {
      window.location.href = tier.ctaLink
      return
    }

    if (!tier.priceId) {
      // Free tier - redirect to create page
      window.location.href = '/create'
      return
    }

    // Check if Stripe is configured
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      alert('Stripe is not configured yet. Please add your Stripe keys to .env.local and restart the dev server.')
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
      return
    }

    setLoading(tier.priceId)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: tier.priceId }),
      })

      if (response.status === 401) {
        router.push('/login?redirect=/pricing')
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Checkout API error:', errorText)
        alert('Failed to start checkout. Please try again.')
        return
      }

      const { url, error } = await response.json()

      if (error) {
        console.error('Checkout error:', error)
        alert(`Checkout failed: ${error}`)
        return
      }

      if (url) {
        window.location.href = url
      } else {
        alert('No checkout URL returned. Please check your Stripe configuration.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 md:mb-8"
        >
          <h1 className="text-5xl font-bold mb-4 pb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you need cloud storage and blockchain timestamping.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('individual')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'individual'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Individual
            </button>
            <button
              onClick={() => setActiveTab('enterprise')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'enterprise'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Enterprise
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {currentTiers.map((tier, index) => {
            const Icon = tier.icon
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${
                  tier.popular
                    ? 'border-primary shadow-2xl shadow-primary/20 scale-105'
                    : 'border-border hover:border-primary/50'
                } transition-all duration-300`}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-primary/10 mx-auto">
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                {/* Tier Name */}
                <h3 className="text-2xl font-bold mb-2 text-center">{tier.name}</h3>

                {/* Price */}
                <div className="mb-4 text-center">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground ml-2">/ {tier.period}</span>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6 text-center">{tier.description}</p>

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={loading !== null}
                  className={`w-full py-3 px-6 rounded-lg font-semibold mb-6 transition-all ${
                    tier.popular
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  } ${loading === tier.priceId ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {loading === tier.priceId ? 'Loading...' : tier.cta}
                </button>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => {
                    const isHighlighted = feature.includes('Price locked forever')
                    return (
                      <li
                        key={feature}
                        className={`flex items-center gap-3 ${
                          isHighlighted
                            ? 'relative rounded-lg p-2 -m-2 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 animate-pulse-slow border border-primary/20'
                            : ''
                        }`}
                      >
                        <Check className={`w-5 h-5 shrink-0 ${isHighlighted ? 'text-primary' : 'text-primary'}`} />
                        <span className={`text-sm ${isHighlighted ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                          {feature}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 md:mt-20 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {currentFAQs.map((faq, index) => (
              <div key={index} className="glass-card rounded-lg p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              View All Questions →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
