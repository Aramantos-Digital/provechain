'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, GitBranch, Edit, Trash2, CheckCircle, Info, Download, Plus, Tag, Settings, Link2, Bot, Shield } from 'lucide-react'

export default function DashboardGuidePage() {
  return (
    <div className="min-h-screen py-6 md:py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 md:mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground frost-light border border-white/10 hover:frost-warm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
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
            Dashboard Guide
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about managing your proofs
          </p>
        </motion.div>

        {/* Guide Sections */}
        <div className="space-y-8">
          {/* CRITICAL: File Immutability Warning */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="glass-card rounded-lg p-6 border-2 border-red-500/30 bg-red-500/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-red-400">CRITICAL: Preserve Your Original Files</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  Your Proofs Depend on Unchanged Files
                </p>
                <p className="text-sm leading-relaxed">
                  <strong className="text-foreground">Each proof is locked to your files exactly as they existed when you created it.</strong> If you modify, overwrite, or delete the original files, the proof becomes invalid and cannot be verified. This would make your proof worthless in a legal dispute.
                </p>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm font-semibold text-orange-400 mb-2">
                  You Must Keep ALL Versions
                </p>
                <p className="text-sm leading-relaxed">
                  If you have 10 proofs across different versions of your work, you must keep all 10 file versions stored separately. Proof v3 requires the exact files from when v3 was created. <strong className="text-foreground">Do not overwrite previous versions.</strong>
                </p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-semibold text-yellow-400 mb-2">
                  How to Handle Updates
                </p>
                <p className="text-sm leading-relaxed">
                  When your work evolves, <strong className="text-foreground">never modify the original files</strong>. Instead:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside mt-2 ml-2">
                  <li>Keep the original files in a protected location</li>
                  <li>Make a copy for your new version</li>
                  <li>Click "New Version" on the proof card to timestamp the updated copy</li>
                  <li>Store both versions safely with restricted access</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-semibold text-blue-400 mb-2">
                  Remember
                </p>
                <p className="text-sm leading-relaxed">
                  ProveChain stores the cryptographic hashes, <strong className="text-foreground">not your files</strong>. You are responsible for preserving the original files. Without them, the proof cannot be verified and has no legal value.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Creating Proofs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-primary">Creating Your First Proof</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Click the <strong className="text-foreground">"+ Create New"</strong> button to upload files or folders.
                ProveChain will hash your files locally and create a timestamped proof.
              </p>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-semibold text-blue-400 mb-1">
                  Privacy Note
                </p>
                <p className="text-sm">
                  All hashing happens in your browser. Your files never leave your device.
                  Only the cryptographic hashes are stored in the cloud.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Version Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <GitBranch className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-orange-500">Version Control</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                When you update files and want to create a new timestamped version,
                use the <strong className="text-foreground">"New Version"</strong> button
                on the original proof card.
              </p>
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm font-semibold text-orange-400 mb-2">
                  Why Use New Version?
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Keeps all versions organized in one proof card</li>
                  <li>Maintains chronological history of your work</li>
                  <li>Works even when file contents change completely</li>
                  <li>Earlier timestamps prove ownership before later ones</li>
                </ul>
              </div>
              <p className="text-sm">
                <strong className="text-foreground">Version dropdown:</strong> Each proof card with
                multiple versions shows a dropdown. Select different versions to view their details.
              </p>
            </div>
          </motion.div>

          {/* Tags & Organization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Tag className="w-6 h-6 text-cyan-500" />
              <h2 className="text-2xl font-bold text-cyan-500">Organizing with Tags</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Tags help you categorize and filter your proofs. Create tags for projects, clients, file types, or any category that helps you stay organized.
              </p>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-sm font-semibold text-cyan-400 mb-2">
                  How Tags Work
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong className="text-foreground">Apply to entire proof groups:</strong> Tags apply to all versions in a proof, not individual versions</li>
                  <li><strong className="text-foreground">Quick filtering:</strong> Click tags in the sidebar to filter your dashboard</li>
                  <li><strong className="text-foreground">Easy management:</strong> Add, remove, rename, or delete tags anytime</li>
                  <li><strong className="text-foreground">Color coded:</strong> Each tag gets a unique color for easy visual identification</li>
                </ul>
              </div>
              <p className="text-sm">
                <strong className="text-foreground">Adding tags:</strong> Click the tag dropdown on any proof card to add/remove tags. Or use Edit Mode for batch operations.
              </p>
            </div>
          </motion.div>

          {/* Edit Mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-pink-500" />
              <h2 className="text-2xl font-bold text-pink-500">Edit Mode Power Features</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Toggle Edit Mode at the top of your dashboard to access advanced features for managing multiple proofs and tags.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-pink-400 mb-2">
                    Batch Tag Operations
                  </p>
                  <p className="text-sm">
                    Select multiple proof cards (use checkboxes) and add or remove tags from all of them at once. Perfect for organizing large collections.
                  </p>
                </div>
                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-pink-400 mb-2">
                    Combine Proofs
                  </p>
                  <p className="text-sm">
                    Merge separate proof cards into one unified version history. Useful if you accidentally created duplicates or want to consolidate related proofs into a single chronological timeline.
                  </p>
                </div>
                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-pink-400 mb-2">
                    Move & Copy Proofs
                  </p>
                  <p className="text-sm">
                    Transfer proofs between your personal storage and team workspaces. <strong>Move</strong> relocates proofs (original is moved), while <strong>Copy</strong> creates independent duplicates (original remains). Choose to transfer just the latest version or full history. Tags that exist in the destination are automatically preserved.
                  </p>
                  <p className="text-xs mt-2 text-muted-foreground italic">
                    Note: Team members can move within teams; only admins can move proofs out of teams.
                  </p>
                </div>
                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-pink-400 mb-2">
                    Tag Management
                  </p>
                  <p className="text-sm">
                    Create new tags, rename existing ones, or delete tags you no longer need. All tag operations are available in the Edit Mode sidebar.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Managing Proofs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Edit className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-purple-500">Managing Your Proofs</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-foreground">Download</h3>
                </div>
                <p className="text-sm">
                  Downloads the JSON proof file containing all file hashes and timestamps.
                  Keep this as offline backup.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-foreground">Info</h3>
                </div>
                <p className="text-sm">
                  View complete proof details including description, official document date,
                  and all file hashes.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="w-4 h-4 text-purple-500" />
                  <h3 className="font-semibold text-foreground">Edit</h3>
                </div>
                <p className="text-sm">
                  Update proof name, description, and official document date. Useful for
                  adding context to help identify proofs later.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-foreground">Verify</h3>
                </div>
                <p className="text-sm">
                  Upload the same files to verify they match the original proof. Shows which
                  files match, which changed, and which are missing.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h3 className="font-semibold text-foreground">Delete</h3>
                </div>
                <p className="text-sm">
                  Remove proofs from your dashboard. You can delete a single version or
                  all versions at once. <strong className="text-red-500">This action is irreversible.</strong>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Blockchain Anchoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-amber-500">Blockchain Anchoring</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Paid plan proofs are automatically anchored to the <strong className="text-foreground">Bitcoin blockchain</strong> via OpenTimestamps, providing independently verifiable, tamper-proof timestamps.
              </p>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm font-semibold text-amber-400 mb-2">
                  How It Works
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>When you create a proof, the hash is submitted to OpenTimestamps calendar servers</li>
                  <li>The calendar servers batch submissions and anchor them to a Bitcoin block</li>
                  <li>Once confirmed, your proof has a Bitcoin-backed timestamp that anyone can verify</li>
                  <li>Confirmation typically takes a few hours</li>
                </ul>
              </div>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm font-semibold text-amber-400 mb-2">
                  Status Indicators
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong className="text-foreground">Confirmed:</strong> Anchored to the Bitcoin blockchain — independently verifiable</li>
                  <li><strong className="text-foreground">Pending:</strong> Submitted to calendar servers, waiting for Bitcoin confirmation</li>
                  <li><strong className="text-foreground">Not anchored:</strong> Free plan proofs (upgrade to enable blockchain anchoring)</li>
                </ul>
              </div>
              <p className="text-sm">
                <strong className="text-foreground">Download .ots file:</strong> You can download the OpenTimestamps proof file from the Info modal. This file can be independently verified at{' '}
                <a href="https://opentimestamps.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">opentimestamps.org</a>
                {' '}— no need to trust ProveChain.
              </p>
            </div>
          </motion.div>

          {/* Connected Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.47 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Link2 className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-blue-500">Connected Services</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Connect your cloud services to ProveChain to enable automated proof generation. Currently supported:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-foreground">GitHub</p>
                  <p className="text-xs text-muted-foreground">Repository snapshots</p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-foreground">OneDrive</p>
                  <p className="text-xs text-muted-foreground">File & folder proofs</p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-foreground">Dropbox</p>
                  <p className="text-xs text-muted-foreground">File & folder proofs</p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <p className="text-sm font-semibold text-foreground">Google Drive</p>
                  <p className="text-xs text-muted-foreground">File & folder proofs</p>
                </div>
              </div>
              <p className="text-sm">
                Manage your connections from the{' '}
                <Link href="/connected-services" className="text-blue-400 underline font-medium">Connected Services</Link>
                {' '}page, accessible from your user menu.
              </p>
            </div>
          </motion.div>

          {/* Automated Proofs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.49 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Bot className="w-6 h-6 text-teal-500" />
              <h2 className="text-2xl font-bold text-teal-500">Automated Proofs</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Set up automations to generate proofs on a schedule without manual intervention. ProveChain will automatically detect changes and create new versions.
              </p>
              <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                <p className="text-sm font-semibold text-teal-400 mb-2">
                  How Automations Work
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Connect a service (e.g. GitHub) and set up an automation</li>
                  <li>Choose a schedule — <strong className="text-foreground">daily</strong> or <strong className="text-foreground">weekly</strong></li>
                  <li>ProveChain checks for changes at each interval</li>
                  <li>If changes are detected, a new proof version is created automatically</li>
                  <li>If nothing changed, the run is skipped (no duplicate proofs)</li>
                </ul>
              </div>
              <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                <p className="text-sm font-semibold text-teal-400 mb-2">
                  Version Chaining
                </p>
                <p className="text-sm">
                  Automated proofs are automatically version-chained. Each new proof links to the previous one, building a chronological timeline of your project's evolution — no manual combining needed.
                </p>
              </div>
              <p className="text-sm">
                You can also <strong className="text-foreground">manually trigger</strong> a proof at any time using the play button on your automation card.
              </p>
            </div>
          </motion.div>

          {/* Proof Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass-card rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Understanding Proof Cards</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>Each proof card displays key information:</p>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>
                  <strong className="text-foreground">Proof Name:</strong> The name you gave this
                  proof (or default filename)
                </li>
                <li>
                  <strong className="text-foreground">Hash:</strong> Unique cryptographic fingerprint
                  of your files
                </li>
                <li>
                  <strong className="text-foreground">Files:</strong> Number of files included in this proof
                </li>
                <li>
                  <strong className="text-foreground">Proof Size:</strong> Size of the JSON proof data we store (not your original file size - we never store that for privacy)
                </li>
                <li>
                  <strong className="text-foreground">Age:</strong> How long ago this proof was created
                </li>
                <li>
                  <strong className="text-foreground">Created:</strong> Exact timestamp when proof was generated
                </li>
                <li>
                  <strong className="text-foreground">Expires:</strong> When this proof will be removed
                  (Free Plan: 48 hours, Paid Plans: Never)
                </li>
                <li>
                  <strong className="text-foreground">Tags:</strong> Color-coded labels to organize your proofs
                </li>
                <li>
                  <strong className="text-foreground">Blockchain:</strong> Bitcoin anchoring status — Confirmed, Pending, or Not anchored (paid plans only)
                </li>
                <li>
                  <strong className="text-foreground">Version Notes:</strong> Audit trail explaining what changed in each version (visible in Info modal)
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Best Practices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass-card rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Best Practices</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-semibold text-green-400 mb-2">
                  Do This
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Create proofs regularly to establish ownership timeline</li>
                  <li>Use "New Version" button to track file evolution</li>
                  <li>Write detailed version notes for your audit trail</li>
                  <li>Use tags to organize proofs by project, client, or category</li>
                  <li>Add meaningful descriptions to help identify proofs later</li>
                  <li>Download proof JSON files and .ots files as offline backups</li>
                  <li>Set official document dates when relevant (contracts, etc.)</li>
                  <li>Use automated proofs for ongoing projects (GitHub repos, cloud folders)</li>
                  <li>Connect your cloud services for hands-free proof generation</li>
                </ul>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  Avoid This
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Don't create duplicate proofs - use "New Version" instead</li>
                  <li>Don't skip version notes - they're crucial for audit trails</li>
                  <li>Don't delete proofs unless absolutely necessary</li>
                  <li>Don't upload sensitive files you don't want hashed</li>
                  <li>Don't rely solely on cloud storage - keep offline backups</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Free vs Paid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="glass-card rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Free vs Paid Plans</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Free Plan</h3>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Manual proof creation</li>
                  <li>Cloud storage: 48-hour expiry</li>
                  <li>Full CLI access</li>
                  <li>Download JSON proofs</li>
                </ul>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Paid Plans</h3>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Everything in Free</li>
                  <li>Permanent proofs (never expire)</li>
                  <li>Bitcoin blockchain anchoring (OpenTimestamps)</li>
                  <li>Connected services & automated proofs</li>
                  <li>Teams & collaboration</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                View Pricing Plans
              </Link>
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 md:mt-16 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Head back to your dashboard and start creating proofs!
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Go to Dashboard
          </Link>
        </motion.div>

        {/* Still have questions? */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-8 md:mt-16 text-center p-8 glass-card rounded-2xl"
        >
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">
            Check our FAQ or get in touch with support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-all"
            >
              View FAQ
            </Link>
            <a
              href="mailto:provechain@aramantos.dev"
              className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"
            >
              Contact Support
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
