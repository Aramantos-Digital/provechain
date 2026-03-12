'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, HelpCircle, ChevronDown, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is ProveChain?',
        a: 'ProveChain is a cryptographic timestamping tool that creates unforgeable proofs of authorship. It uses SHA-256 hashing to generate cryptographic fingerprints of your files, proving you had access to those files at a specific point in time.',
      },
      {
        q: 'How does it work?',
        a: 'ProveChain hashes your files locally using SHA-256, creates a timestamped JSON proof, and (for paid tiers) anchors that proof to a blockchain for immutable verification. Your files never leave your machine unless you explicitly upload them.',
      },
      {
        q: 'Why should I use ProveChain?',
        a: 'Protect your intellectual property, prove authorship in disputes, create audit trails for compliance, timestamp innovations before public release, and establish priority in patent applications.',
      },
    ],
  },
  {
    category: 'Pricing',
    questions: [
      {
        q: "What's included in the Free tier?",
        a: 'The Free tier includes unlimited access to our CLI tool and Web UI for local hashing. You can create unlimited proofs and download them as JSON files. Perfect for personal projects and open-source work.',
      },
      {
        q: 'Are there usage limits on the Pro tier?',
        a: 'Pro tier includes unlimited cloud storage with fair use (~100 proofs/month is typical). Need more? Email us at provechain@aramantos.dev - we\'re flexible for genuine use cases and won\'t nickel-and-dime you.',
      },
      {
        q: 'What is "Founding Member" pricing?',
        a: 'The first 100 users who subscribe get €5/month pricing locked in forever. Even as we add features and raise prices, Founding Members keep their €5 rate for life. This is our way of thanking early supporters.',
      },
      {
        q: 'What happens if I cancel my Founding Member subscription?',
        a: 'Founding Members who cancel have 30 days to reactivate at their locked-in €5 rate. After 30 days, you can still come back, but you\'ll need to subscribe at the current Pro rate (€9/month). This grace period is our way of showing appreciation for early supporters.',
      },
      {
        q: "What's the difference between Founding Member and Pro?",
        a: 'Both tiers include the same features: cloud storage, blockchain timestamping, proof history, and priority support. The only difference is the price. Founding Members get €5/month locked forever, while Pro is €9/month.',
      },
      {
        q: 'Can I upgrade from Free to Paid later?',
        a: 'Yes! Your Free tier proofs remain valid forever. When you upgrade, you unlock cloud storage, blockchain timestamping, and proof history for future proofs.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel your subscription anytime from your account dashboard. You\'ll still have access until the end of your billing period. All proofs you\'ve created remain valid forever.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        q: 'Can you read, access, or see my files?',
        a: 'No. Never. Absolutely not. ProveChain CANNOT access your files: (1) The free CLI and Web UI run 100% locally on your machine, nothing is sent to our servers, (2) When you use paid tiers, only SHA-256 hashes (cryptographic fingerprints) are stored, not your actual files, (3) SHA-256 hashes are one-way functions, so we cannot reverse them to get your files even if we wanted to. Your files are private and stay on your device.',
      },
      {
        q: 'Do you store my files?',
        a: 'No. We only store cryptographic hashes (SHA-256 fingerprints) of your files, never the files themselves. On the Free tier, nothing is sent to our servers at all. Everything runs locally. On paid tiers, we only store proof metadata (file paths, hashes, timestamps).',
      },
      {
        q: 'How is my data encrypted?',
        a: 'All data transmitted to our servers uses TLS encryption. Paid tier proof storage uses AES-256-GCM encryption at rest. Your API keys and session tokens are never logged.',
      },
      {
        q: 'Can ProveChain reverse a hash to get my files?',
        a: 'No. SHA-256 is a one-way cryptographic hash function. It\'s computationally infeasible to reverse a hash back to the original files. Even we cannot recover your files from the hashes.',
      },
      {
        q: 'What happens to my data if I delete my account?',
        a: 'All your proofs and metadata are permanently deleted within 30 days. Blockchain timestamps are immutable and remain on-chain, but they only contain hashes, not identifiable information.',
      },
      {
        q: 'Is ProveChain GDPR compliant?',
        a: 'Yes. We follow privacy-by-design principles, collect minimal data, honor right-to-deletion requests, and process data only as necessary to provide the service.',
      },
    ],
  },
  {
    category: 'Technical',
    questions: [
      {
        q: 'What hashing algorithm do you use?',
        a: 'SHA-256 (Secure Hash Algorithm 256-bit), the same cryptographic hash function used by Git, Bitcoin, and TLS certificates. It\'s an industry-standard algorithm audited by security researchers worldwide.',
      },
      {
        q: 'Which blockchain do you use for timestamping?',
        a: 'We use Bitcoin blockchain via OpenTimestamps for immutable proof anchoring (paid tiers only). OpenTimestamps creates a cryptographic proof that your file hash existed at a specific point in time, anchored to the Bitcoin blockchain.',
      },
      {
        q: 'Can I verify proofs without ProveChain?',
        a: 'Yes. Proof files are standard JSON format containing file paths and hashes. You can manually re-hash your files and compare against the proof using any SHA-256 tool (e.g., sha256sum on Linux, CertUtil on Windows).',
      },
      {
        q: 'Does ProveChain work with Git?',
        a: 'Yes. ProveChain complements Git by adding timestamping and legal proof capabilities. While Git tracks changes, ProveChain proves when you had access to specific file versions.',
      },
      {
        q: 'Can I use ProveChain in CI/CD pipelines?',
        a: 'Yes. The CLI tool can be integrated into GitHub Actions, GitLab CI, Jenkins, or any automation pipeline. Use it to timestamp releases automatically.',
      },
    ],
  },
  {
    category: 'Legal',
    questions: [
      {
        q: 'Will ProveChain proofs hold up in court?',
        a: 'ProveChain proofs provide strong cryptographic evidence of file possession at a specific time. While we cannot guarantee legal outcomes (consult a lawyer), cryptographic proofs are increasingly accepted in IP disputes and patent applications.',
      },
      {
        q: 'Can I use ProveChain for patent applications?',
        a: 'Yes. Timestamped proofs can establish "date of invention" or "prior art" in patent applications. However, patent law is complex, so consult a patent attorney for your specific case.',
      },
      {
        q: 'What is your liability for data loss?',
        a: 'Our liability is limited to 12 months of fees paid (or €100, whichever is lower). We maintain backups and high availability, but we recommend keeping your own copies of proof files for critical projects.',
      },
      {
        q: 'Do you offer professional indemnity insurance?',
        a: 'Yes. ProveChain is covered by €1,000,000 in professional indemnity insurance for legal-tech related claims.',
      },
    ],
  },
  {
    category: 'Support',
    questions: [
      {
        q: 'How do I contact support?',
        a: 'Email us at provechain@aramantos.dev. Paid tier users get priority support (response within 24 hours). Free tier users receive community support via GitHub Discussions.',
      },
      {
        q: 'Do you offer refunds?',
        a: 'Yes. If you\'re not satisfied within the first 14 days, we\'ll refund your first month, no questions asked.',
      },
      {
        q: 'Can I get help integrating ProveChain into my workflow?',
        a: 'Yes. We offer onboarding calls for paid tier users. Email provechain@aramantos.dev to schedule a session.',
      },
    ],
  },
]

const enterpriseFAQs = [
  {
    category: 'Team Features',
    questions: [
      {
        q: 'What team sizes do you support?',
        a: 'Professional plan supports up to 5 team members, Business up to 25, and Custom tier supports unlimited team members with custom pricing.',
      },
      {
        q: 'Do you offer SSO and SAML integration?',
        a: 'Yes. Professional tier includes OAuth SSO. Custom tier includes SAML SSO for integration with identity providers like Okta, Azure AD, and Auth0.',
      },
      {
        q: 'What compliance certifications do you have?',
        a: 'We maintain SOC 2 Type II and ISO 27001 certifications. Custom tier customers can request compliance reports and audit documentation. We also support GDPR and HIPAA requirements with appropriate BAAs.',
      },
      {
        q: 'Can we deploy on-premise?',
        a: 'Yes. Custom tier includes on-premise deployment options with dedicated support for installation and maintenance. Contact sales for architecture requirements.',
      },
      {
        q: 'What SLAs do you offer?',
        a: 'Business tier includes 99.9% uptime SLA. Custom tier offers custom SLAs up to 99.99% with guaranteed response times and dedicated support channels.',
      },
    ],
  },
  {
    category: 'Fair Usage (Team Tiers)',
    questions: [
      {
        q: 'Are there API rate limits for team tiers?',
        a: 'Professional tier: 100K API requests/month. Business and Custom: Unlimited API requests with fair use policy. If you anticipate extremely high usage (>10M requests/month), contact sales for custom infrastructure.',
      },
      {
        q: 'How many proofs can team tier users create?',
        a: 'All team tiers include unlimited proof creation with generous fair use policies. We monitor for abuse but have never had to throttle a legitimate team customer.',
      },
      {
        q: 'What is your fair use policy?',
        a: 'We define fair use as normal business operations without intentional abuse. For example: creating thousands of proofs per day is fine. Creating millions of tiny proofs to stress-test our infrastructure is not. We\'ll always contact you before any action.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        q: 'Do you offer annual billing?',
        a: 'Yes. Annual billing includes 2 months free (equivalent to ~17% discount). Custom tier customers can also request quarterly or custom billing terms.',
      },
      {
        q: 'Can we add team members mid-contract?',
        a: 'Yes. Additional team members are pro-rated for the remainder of your billing period. Upgrade to a higher tier anytime with immediate access.',
      },
      {
        q: 'What payment methods do you accept for team tiers?',
        a: 'We accept credit cards, ACH transfers, wire transfers, and purchase orders. Custom tier customers can request NET 30 or NET 60 payment terms.',
      },
    ],
  },
  {
    category: 'Support & Onboarding',
    questions: [
      {
        q: 'What support channels are available?',
        a: 'Professional: Email support with <24hr response. Business: Email + Slack Connect with <4hr response. Custom: Dedicated support engineer, Slack Connect, and optional phone support.',
      },
      {
        q: 'Do you provide onboarding and training?',
        a: 'Yes. All team tiers include onboarding calls. Business and Custom tiers include custom training sessions for your team and optional workshops for advanced integrations.',
      },
      {
        q: 'Can you help with custom integrations?',
        a: 'Yes. Business tier includes basic integration support. Custom tier includes dedicated engineering resources for custom integrations with your existing systems (CI/CD, document management, etc.).',
      },
    ],
  },
]

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState<'user' | 'enterprise'>('user')
  const [openCategory, setOpenCategory] = useState<string>('General')

  const currentFAQs = activeTab === 'user' ? faqs : enterpriseFAQs

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? '' : category)
  }

  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 md:mb-8 flex items-center justify-between"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground frost-light border border-white/10 hover:frost-warm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-sm hover:shadow-md"
          >
            View Pricing →
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-16"
        >
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary/10">
              <HelpCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 pb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about ProveChain
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="max-w-md mx-auto mb-12">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => {
                setActiveTab('user')
                setOpenCategory('General')
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'user'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Free/Pro
            </button>
            <button
              onClick={() => {
                setActiveTab('enterprise')
                setOpenCategory('Team Features')
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md font-medium transition-all',
                activeTab === 'enterprise'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Teams
            </button>
          </div>
        </div>

        {/* FAQ Categories - Accordion */}
        <div className="space-y-4">
          {currentFAQs.map((category, categoryIndex) => {
            const isOpen = openCategory === category.category

            return (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                className="glass-card rounded-lg overflow-hidden"
              >
                {/* Category Header - Clickable */}
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-center sm:justify-between p-6 hover:bg-accent/50 transition-colors"
                >
                  <h2 className="text-2xl font-bold text-primary">
                    {category.category}
                  </h2>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute sm:relative right-6 sm:right-auto"
                  >
                    <ChevronDown className="w-6 h-6 text-muted-foreground" />
                  </motion.div>
                </button>

                {/* Category Questions - Collapsible */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
                        {category.questions.map((faq, faqIndex) => (
                          <div
                            key={faqIndex}
                            className="bg-background/50 rounded-lg p-5 border border-border/50"
                          >
                            <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                              {faq.a}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 md:mt-16 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start protecting your intellectual property today. Free forever, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Try ProveChain Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 frost-light border border-white/10 hover:frost-warm text-foreground rounded-lg font-semibold transition-all"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>

        {/* Get in Touch */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 md:mt-16 text-center p-8 glass-card rounded-2xl"
        >
          <h2 className="text-2xl font-bold mb-2">Get in Touch</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Interested in our products, exploring a partnership, or just curious about Aramantos Digital? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:support@aramantos.dev"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"
            >
              <Mail className="h-4 w-4" />
              support@aramantos.dev
            </a>
            <a
              href="https://www.linkedin.com/company/aramantos-digital"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-border text-foreground hover:bg-accent transition-all"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a
              href="https://discord.gg/H9VTFdcj5S"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-border text-foreground hover:bg-accent transition-all"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
              Discord
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
