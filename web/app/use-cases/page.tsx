'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Code2,
  Scale,
  PenTool,
  GraduationCap,
  Palette,
  Briefcase,
  Lightbulb,
  Gamepad2,
  Music,
  FileText,
  Shield,
  Users
} from 'lucide-react'

const useCases = [
  {
    icon: Code2,
    title: 'Software Developers',
    problem: 'Someone copies your open-source code and claims they wrote it first',
    solution: 'Create timestamped proofs of every release.\nIf disputes arise, you have cryptographic evidence showing you had the code on a specific date.',
    examples: [
      'Prove you wrote code before a copycat project launched',
      'Timestamp MVP releases for investor due diligence',
      'Document contractor deliverables with exact dates',
      'Establish prior art for patent applications',
    ],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Scale,
    title: 'Lawyers & Legal Professionals',
    problem: 'Need to prove when documents were created or received for litigation',
    solution: 'Hash legal documents, contracts, evidence files, and correspondence.\nCreate an immutable audit trail that holds up in court.',
    examples: [
      'Timestamp client deliverables and agreements',
      'Prove document versions existed at specific times',
      'Create evidence chains for litigation',
      'Protect IP disclosures before filing',
    ],
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: PenTool,
    title: 'Writers & Authors',
    problem: 'Worried someone will steal your manuscript or claim they wrote it first',
    solution: 'Hash your drafts, manuscripts, and story ideas.\nProve you had the work before publication or before someone else claims authorship.',
    examples: [
      'Timestamp book manuscripts before sending to publishers',
      'Protect screenplay ideas before pitching to studios',
      'Prove blog post originality in copyright disputes',
      'Document article drafts before publication',
    ],
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: GraduationCap,
    title: 'Researchers & Academics',
    problem: 'Research integrity, data provenance, and publication priority disputes',
    solution: 'Timestamp datasets, analysis code, and research findings before publication.\nEstablish research priority and maintain audit trails.',
    examples: [
      'Prove dataset authenticity for peer review',
      'Timestamp research code before publication',
      'Document lab notebook entries',
      'Establish priority in competitive research fields',
    ],
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Palette,
    title: 'Designers & Creatives',
    problem: 'Clients claim they had the design idea, or someone steals your portfolio work',
    solution: 'Hash design files, mockups, and creative assets. Prove when you created specific designs in client disputes.',
    examples: [
      'Timestamp logo designs before client delivery',
      'Protect UI/UX mockups in your portfolio',
      'Prove design revisions timeline in disputes',
      'Document concept art before pitches',
    ],
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Briefcase,
    title: 'Agencies & Contractors',
    problem: 'Scope creep, timeline disputes, and "you never delivered that" arguments',
    solution: 'Create proofs of every deliverable, every milestone. Show exactly what was delivered and when.',
    examples: [
      'Timestamp project deliverables for clients',
      'Prove scope completion dates',
      'Document change requests and approvals',
      'Protect against payment disputes',
    ],
    color: 'from-indigo-500 to-purple-500',
  },
  {
    icon: Lightbulb,
    title: 'Inventors & Patent Applicants',
    problem: 'Need to establish "date of invention" for patent applications',
    solution: 'Timestamp invention disclosures, prototypes, and technical specifications. Establish prior art and prove conception dates.',
    examples: [
      'Document invention disclosure before filing',
      'Prove prior art in patent disputes',
      'Timestamp prototype CAD files',
      'Establish conception date for patents',
    ],
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'Startups & Founders',
    problem: 'Investor disputes, co-founder disagreements, and trade secret protection',
    solution: 'Timestamp pitch decks, business plans, and product roadmaps. Prove what was discussed when.',
    examples: [
      'Timestamp pitch decks before investor meetings',
      'Prove MVP state during funding rounds',
      'Document co-founder agreements',
      'Protect trade secrets before disclosure',
    ],
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Gamepad2,
    title: 'Game Developers',
    problem: 'Someone releases a suspiciously similar game after you shared your idea',
    solution: 'Hash game design documents, concept art, and code. Prove you had the idea first.',
    examples: [
      'Timestamp game design documents',
      'Protect concept art and character designs',
      'Prove game mechanics existed before copycats',
      'Document alpha/beta versions',
    ],
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Music,
    title: 'Music Producers & Composers',
    problem: 'Beat theft, melody disputes, and "I wrote that hook" arguments',
    solution: 'Hash MIDI files, stems, project files, and lyrics. Prove you created the work before release.',
    examples: [
      'Timestamp unreleased tracks and demos',
      'Protect lyrics before collaboration',
      'Prove production work in credit disputes',
      'Document composition dates',
    ],
    color: 'from-fuchsia-500 to-pink-500',
  },
  {
    icon: FileText,
    title: 'Technical Writers & Documentarians',
    problem: 'Documentation versioning, attribution, and "who wrote this section" disputes',
    solution: 'Timestamp documentation versions, API guides, and technical specs. Track contribution history.',
    examples: [
      'Prove documentation existed before product launch',
      'Track technical specification versions',
      'Establish authorship in team projects',
      'Document API specifications before release',
    ],
    color: 'from-teal-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Compliance & Audit Teams',
    problem: 'Need immutable audit trails for regulatory compliance',
    solution: 'Create cryptographic proofs of code releases, configuration changes, and compliance documentation.',
    examples: [
      'Timestamp compliance reports for audits',
      'Prove system configuration states',
      'Document security patch deployments',
      'Create audit trails for SOC2/ISO compliance',
    ],
    color: 'from-emerald-500 to-teal-500',
  },
]

export default function UseCasesPage() {
  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-6xl">
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
          <h1 className="text-5xl font-bold mb-4 pb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Who Uses ProveChain?
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From developers to lawyers, writers to researchers. Anyone who needs to prove "I had this work at this time"
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="space-y-8">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon
            return (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="glass-card rounded-2xl p-8 hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex flex-row gap-6">
                  {/* Icon - appears on right on small/medium, left on large */}
                  <div className="shrink-0 order-2 md:order-1">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${useCase.color} bg-opacity-10`}>
                      <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 order-1 md:order-2">
                    <h2 className="text-2xl font-bold mb-3">{useCase.title}</h2>

                    <div className="space-y-4">
                      {/* Problem */}
                      <div>
                        <p className="text-sm font-semibold text-red-500 text-red-400 mb-1">
                          ❌ Problem:
                        </p>
                        <p className="text-muted-foreground whitespace-pre-line">{useCase.problem}</p>
                      </div>

                      {/* Solution */}
                      <div>
                        <p className="text-sm font-semibold text-green-500 text-green-400 mb-1">
                          ✅ Solution:
                        </p>
                        <p className="text-muted-foreground whitespace-pre-line">{useCase.solution}</p>
                      </div>

                      {/* Examples */}
                      <div>
                        <p className="text-sm font-semibold text-primary mb-2">
                          Real-World Examples:
                        </p>
                        <ul className="grid md:grid-cols-2 gap-2">
                          {useCase.examples.map((example, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-0.5 leading-none">•</span>
                              <span className="flex-1">{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Why It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-8"
        >
          <h2 className="text-3xl font-bold mb-6 text-center">Why ProveChain Works for Everyone</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Cryptographic Proof</h3>
              <p className="text-sm text-muted-foreground">
                SHA-256 hashing creates unforgeable fingerprints of your work
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Immutable Timestamps</h3>
              <p className="text-sm text-muted-foreground">
                Blockchain anchoring (paid tiers) makes proofs permanent and verifiable
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Legal Weight</h3>
              <p className="text-sm text-muted-foreground">
                Cryptographic proofs are increasingly accepted in courts and disputes
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Protect Your Work?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start creating cryptographic proofs in seconds. Free forever for CLI and Web UI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
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
      </div>
    </div>
  )
}
