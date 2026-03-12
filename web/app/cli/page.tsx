'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Terminal,
  Shield,
  Check,
  ArrowLeft,
  Cloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TierTab = 'free' | 'professional'

interface Command {
  command: string
  description: string
  example?: string
}

const commands: Record<string, Command[]> = {
  free: [
    {
      command: 'provechain init',
      description: 'Initialize ProveChain in your project',
      example: '✓ ProveChain Initialized!\nLocation: /path/to/project\nConfig: provechain.yaml',
    },
    {
      command: 'provechain snapshot "description"',
      description: 'Create a cryptographic proof snapshot',
      example: '✓ Snapshot Created Successfully!\nProof ID: a1b2c3d4-...\nFiles Hashed: 50,208',
    },
    {
      command: 'provechain verify <proof-file>',
      description: 'Verify a proof file against current state',
      example: '✓ Verification PASSED\nMatches: 50,208 (100.0%)',
    },
    {
      command: 'provechain list',
      description: 'List all proof files with interactive selection',
      example: 'ProveChain Proofs (3 total)\n# │ Timestamp │ Description',
    },
    {
      command: 'provechain diff <proof1> <proof2>',
      description: 'Compare two proof files to see what changed',
      example: 'Added: 15 files | Removed: 3 files | Modified: 7 files',
    },
    {
      command: 'provechain log "event"',
      description: 'Log an innovation event to the ledger',
      example: '✓ Innovation logged: Implemented OAuth2',
    },
    {
      command: 'provechain --json <command>',
      description: 'Output results in JSON format for automation',
      example: '{"success": true, "proof_id": "abc123..."}',
    },
  ],
  professional: [
    {
      command: 'provechain login',
      description: 'Login to ProveChain cloud for sync',
      example: '✓ Login successful!\nLogged in as: user@example.com',
    },
    {
      command: 'provechain logout',
      description: 'Logout from ProveChain cloud',
      example: 'Logged out successfully',
    },
    {
      command: 'provechain whoami',
      description: 'Show current login status and tier info',
      example: 'Logged in as: user@example.com\nTier: professional',
    },
    {
      command: 'provechain snapshot --sync "description"',
      description: 'Create a snapshot and sync it to the cloud',
      example: '✓ Snapshot Created Successfully!\nProof ID: a1b2c3d4-...\n✓ Synced to cloud',
    },
  ],
}

export default function CLIPage() {
  const [activeTab, setActiveTab] = useState<TierTab>('free')

  const tierInfo = {
    free: {
      title: 'Free / Local',
      icon: Shield,
      description: 'Perfect for personal projects and open source',
      badge: '100% Local',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    professional: {
      title: 'Cloud Sync',
      icon: Cloud,
      description: 'For professional developers needing cloud sync and blockchain anchoring',
      badge: 'Paid Plans',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
  }

  const currentTierInfo = tierInfo[activeTab]
  const TierIcon = currentTierInfo.icon

  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 flex items-center justify-between"
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
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Terminal className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 pb-1 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            ProveChain CLI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Powerful command-line tool for cryptographic proof creation
          </p>
        </motion.div>

        {/* Installation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Installation</h2>
            <p className="text-muted-foreground mb-4">
              Install ProveChain globally via npm (Node.js 18+ required):
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm flex items-center justify-between gap-4">
              <code>npm install -g @aramantos/provechain-cli</code>
              <button className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors">
                Copy
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tier Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setActiveTab('free')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center',
                  activeTab === 'free'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Shield className="w-4 h-4 mr-2" />
                Free / Local
              </button>
              <button
                onClick={() => setActiveTab('professional')}
                className={cn(
                  'flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center',
                  activeTab === 'professional'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Cloud className="w-4 h-4 mr-2" />
                Cloud Sync
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tier Info Banner */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'mb-8 rounded-lg border p-6',
            currentTierInfo.bgColor,
            currentTierInfo.borderColor
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-lg', 'bg-background/50')}>
              <TierIcon className={cn('w-8 h-8', currentTierInfo.color)} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">{currentTierInfo.title}</h3>
              <p className="text-muted-foreground">{currentTierInfo.description}</p>
            </div>
            <div className={cn('px-4 py-2 rounded-full font-semibold', currentTierInfo.bgColor, 'border', currentTierInfo.borderColor)}>
              {currentTierInfo.badge}
            </div>
          </div>
        </motion.div>

        {/* Commands for Current Tier */}
        <motion.div
          key={`commands-${activeTab}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-bold">Available Commands</h2>

          {/* Core Commands (if free tier) */}
          {activeTab === 'free' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-muted-foreground">Core Commands (All Plans)</h3>
              {commands.free.map((cmd, idx) => (
                <CommandCard key={idx} command={cmd} />
              ))}
            </div>
          )}

          {/* Cloud Commands (if professional tier) */}
          {activeTab === 'professional' && (
            <>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-muted-foreground">Core Commands</h3>
                {commands.free.map((cmd, idx) => (
                  <CommandCard key={idx} command={cmd} />
                ))}
              </div>
              <div className="space-y-4 mt-8">
                <h3 className="text-xl font-semibold text-primary">Cloud Sync Commands</h3>
                {commands.professional.map((cmd, idx) => (
                  <CommandCard key={idx} command={cmd} highlight />
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Tier Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="bg-card border border-border rounded-lg p-6">
              <Shield className="w-8 h-8 text-green-500 mb-3" />
              <h3 className="font-bold text-lg mb-2">Free / Local</h3>
              <p className="text-sm text-muted-foreground mb-4">Free forever</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>All core CLI commands</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>JSON output mode</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Local-only (no cloud)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Unlimited local proofs</span>
                </li>
              </ul>
            </div>

            {/* Cloud Sync */}
            <div className="bg-card border-2 border-primary rounded-lg p-6">
              <Cloud className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-bold text-lg mb-2">Cloud Sync</h3>
              <p className="text-sm text-muted-foreground mb-4">Paid Plans</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Cloud proof storage</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Blockchain timestamps</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Version control</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Install the CLI for free, or upgrade for cloud sync and blockchain anchoring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create?tab=cli"
              className="inline-flex items-center justify-center px-8 py-4 frost-light border border-white/10 hover:frost-warm text-foreground rounded-lg font-semibold transition-all"
            >
              Try Free Now
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function CommandCard({
  command,
  highlight = false,
}: {
  command: Command
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-6 transition-all',
        highlight ? 'border-primary/50 bg-primary/5' : 'border-border'
      )}
    >
      <h3 className="font-semibold mb-2 text-lg">
        <code className="text-primary">{command.command}</code>
      </h3>
      <p className="text-muted-foreground mb-3 text-sm">
        {command.description}
      </p>
      {command.example && (
        <div className="bg-muted rounded p-3 font-mono text-xs">
          <pre className="text-foreground whitespace-pre-wrap">{command.example}</pre>
        </div>
      )}
    </div>
  )
}
