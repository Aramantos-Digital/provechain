'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Users, UserPlus, Shield, FolderOpen, Settings, GitBranch, Lock } from 'lucide-react'

export default function TeamGuidePage() {
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-16"
        >
          <h1 className="text-5xl font-bold mb-4 pb-1 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Teams Guide
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about team collaboration on ProveChain
          </p>
        </motion.div>

        {/* Guide Sections */}
        <div className="space-y-8">
          {/* What Are Teams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-bold text-indigo-500">What Are Teams?</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Teams allow multiple users to collaborate on a shared proof workspace. Perfect for agencies,
                development teams, or any group that needs to manage proofs together.
              </p>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <p className="text-sm font-semibold text-indigo-400 mb-1">
                  Team vs Personal Storage
                </p>
                <p className="text-sm">
                  <strong className="text-foreground">Personal Storage:</strong> Only you can see and manage your proofs.
                  <br />
                  <strong className="text-foreground">Team Storage:</strong> All team members can view, create, and manage team proofs.
                </p>
              </div>
              <p className="text-sm">
                You can switch between Personal Storage and Team views using the filter dropdown on your dashboard.
              </p>
            </div>
          </motion.div>

          {/* Creating & Managing Teams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-green-500">Creating & Managing Teams</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Creating a Team</h3>
                <p className="text-sm">
                  Navigate to your Teams page and click "Create Team". Give your team a name,
                  and you're automatically added as the team admin (owner).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Inviting Members</h3>
                <p className="text-sm mb-2">
                  As a team admin, you can invite members by email. They'll receive both an email invitation
                  and an in-app notification (if they already have an account).
                </p>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs">
                    <strong className="text-foreground">Invitation Process:</strong> Enter the invitee's email →
                    They receive notification → They accept → Added to team
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Managing Members</h3>
                <p className="text-sm">
                  View all team members, pending invitations, and remove members from your team page.
                  You can also promote members to admin or demote them back to regular members.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Team Roles & Permissions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-orange-500">Roles & Permissions</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Teams have two roles with different permission levels:
              </p>
              <div className="space-y-3">
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-orange-400 mb-2">
                    Admin (Owner)
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Full access to all team features</li>
                    <li>Invite and remove members</li>
                    <li>Create, view, edit, and delete team proofs</li>
                    <li>Move proofs in and out of the team</li>
                    <li>Copy proofs anywhere</li>
                    <li>Manage team settings</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm font-semibold text-blue-400 mb-2">
                    Member
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>View all team proofs</li>
                    <li>Create new team proofs</li>
                    <li>Edit and delete their own team proofs</li>
                    <li>Move proofs within the team only</li>
                    <li>Copy proofs anywhere</li>
                    <li><strong className="text-red-500">Cannot</strong> move proofs out of the team</li>
                    <li><strong className="text-red-500">Cannot</strong> invite or remove members</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Working with Team Proofs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FolderOpen className="w-6 h-6 text-cyan-500" />
              <h2 className="text-2xl font-bold text-cyan-500">Working with Team Proofs</h2>
            </div>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Creating Team Proofs</h3>
                <p className="text-sm">
                  When viewing team storage, click "Create New" and upload files as usual.
                  The proof will be created in the team workspace, visible to all members.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Moving Proofs to Teams</h3>
                <p className="text-sm mb-2">
                  Use Edit Mode to move existing personal proofs to a team workspace:
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside ml-2">
                  <li>Enable Edit Mode on your dashboard</li>
                  <li>Select the proofs you want to move</li>
                  <li>Click "Move" and choose your team as the destination</li>
                  <li>Select whether to move just the latest version or full history</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Copying Proofs</h3>
                <p className="text-sm">
                  Create independent duplicates in another location (personal or team).
                  The original proof remains unchanged. Perfect for creating backups or
                  sharing proofs across teams.
                </p>
              </div>

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-sm font-semibold text-cyan-400 mb-1">
                  Tag Behavior
                </p>
                <p className="text-sm">
                  When moving or copying proofs, only tags that exist in the destination are preserved.
                  Team tags are separate from personal tags, so you'll need to recreate
                  team-specific tags for the team workspace.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Team Tiers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass-card rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-purple-500">Team Tiers & Limits</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Professional</h3>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Up to 5 team members</li>
                  <li>Unlimited team proofs</li>
                  <li>Lifetime proof storage</li>
                  <li>Team collaboration</li>
                </ul>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Business</h3>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Up to 25 team members</li>
                  <li>Unlimited team proofs</li>
                  <li>Lifetime proof storage</li>
                  <li>API access</li>
                  <li>Priority support</li>
                </ul>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Enterprise</h3>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Unlimited members</li>
                  <li>Unlimited team proofs</li>
                  <li>Lifetime proof storage</li>
                  <li>API access</li>
                  <li>Custom integrations</li>
                  <li>Dedicated support</li>
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

          {/* Best Practices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass-card rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">Team Best Practices</h2>
            <div className="space-y-3 text-muted-foreground">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-semibold text-green-400 mb-2">
                  Do This
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Create descriptive team names that indicate their purpose</li>
                  <li>Use team tags to organize proofs by project or client</li>
                  <li>Regularly review team members and remove inactive users</li>
                  <li>Move project-specific proofs to team storage for collaboration</li>
                  <li>Set up dedicated teams for each major project or client</li>
                </ul>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  Avoid This
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Don't share sensitive personal proofs in team workspaces</li>
                  <li>Don't give admin access to members who don't need it</li>
                  <li>Don't create overlapping teams with the same members</li>
                  <li>Don't move proofs to teams without team consensus</li>
                  <li>Don't ignore pending invitations - clean them up regularly</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 md:mt-16 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Start Collaborating?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Head to your Teams page and create your first team!
          </p>
          <Link
            href="/teams"
            className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Go to Teams
          </Link>
        </motion.div>

        {/* Still have questions? */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 md:mt-16 text-center p-8 glass-card rounded-2xl"
        >
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">
            Check our Dashboard Guide or get in touch with support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/guide"
              className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-all"
            >
              Dashboard Guide
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
