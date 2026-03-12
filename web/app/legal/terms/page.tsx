'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
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
              <FileText className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 pb-1">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: March 12, 2026</p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-invert max-w-none"
        >
          <div className="bg-card border border-border rounded-lg p-8 space-y-8">

            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using ProveChain (the "Service"), you agree to be bound by these Terms of Service ("Terms").
                If you do not agree with any part of these Terms, you may not use the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                These Terms apply to all users of the Service, including both free and paid tiers.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                For business customers, processing of personal data is governed by the Aramantos Digital Data Processing Agreement, available at <a href="https://aramantos.dev/dpa" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aramantos.dev/dpa</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                ProveChain provides cryptographic timestamping and proof-of-existence services for digital files. The Service includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Free Tier:</strong> CLI tool and Web UI for local file hashing (MIT licensed)</li>
                <li><strong>Paid Tiers:</strong> Cloud storage, blockchain timestamping, proof history, and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate information when creating an account</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not upload malicious code, viruses, or harmful content</li>
                <li>Not attempt to reverse engineer, hack, or circumvent security measures</li>
                <li>Maintain your own backups of proof files</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Your Content:</strong> You retain all rights to your files. ProveChain only stores cryptographic hashes
                (SHA-256 fingerprints) and file/folder names, not your actual file contents.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Our Service:</strong> The ProveChain CLI is open-source under the MIT License. The web application, API,
                and backend services are proprietary and owned by Aramantos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Pricing and Payments</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">5.1 Free Tier</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The CLI tool is free forever (MIT licensed). The Web UI free tier includes manual proof creation with 48-hour proof expiry. Blockchain anchoring and connected services require a paid plan.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">5.2 Paid Tiers</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Founding Member:</strong> €5/month (locked forever for first 100 users)</li>
                    <li><strong>Professional:</strong> €9/month (standard tier)</li>
                    <li><strong>Team/Business/Custom:</strong> Enterprise tiers (see pricing page for details)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">5.3 Billing</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Subscriptions are billed monthly via Stripe. Prices are in EUR and exclude VAT (if applicable).
                    No refunds after 14 days.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Privacy and Data Collection</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Your use of ProveChain is subject to our Privacy Policy. Key points:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We collect minimal data (email, file names, proof metadata, payment info for paid tiers)</li>
                <li>We do NOT store your source code or file contents (only cryptographic hashes)</li>
                <li>Manual proof uploads are hashed locally in your browser; files never leave your device</li>
                <li>Connected service proofs (GitHub, OneDrive, Google Drive, Dropbox) are hashed on our servers, but file contents are never stored</li>
                <li>The CLI tool collects zero data (everything runs locally)</li>
                <li>We comply with GDPR (right to access, deletion, portability)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. File Immutability and Preservation Requirements</h2>
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  ⚠️ CRITICAL: Your Proofs Depend on Unchanged Files
                </p>
                <p className="text-sm text-muted-foreground">
                  Each cryptographic proof is permanently locked to the exact file versions that existed when you created it.
                  If you modify, overwrite, or delete the original files, the proof becomes invalid and worthless.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">7.1 Your Responsibilities</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    To maintain proof validity, you MUST:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Preserve Original Files:</strong> Keep exact file versions used for each proof unchanged and accessible</li>
                    <li><strong>Store All Versions Separately:</strong> If you have multiple proof versions, maintain separate copies for each</li>
                    <li><strong>Never Overwrite:</strong> When updating your work, create copies instead of modifying originals</li>
                    <li><strong>Use "New Version" Feature:</strong> Create new proof versions instead of editing files in place</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">7.2 Consequences of File Modification</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    If you modify original files after proof creation:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>The proof hash will not match current file state</li>
                    <li>Verification will fail</li>
                    <li>The proof has <strong>no legal value</strong></li>
                    <li>You cannot retroactively "fix" the proof</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">7.3 Our Liability</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong>ProveChain stores cryptographic hashes only - NOT your actual files.</strong> We are NOT responsible for:
                      files you modify, delete, or overwrite; loss of original file versions; failed proof verification due to file changes;
                      or legal disputes caused by missing or modified files.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      <strong>You are solely responsible for preserving original files.</strong> Without them, your proofs are worthless.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Disclaimers and Warranties</h2>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-yellow-400 mb-2">
                  YOUR RESPONSIBILITY
                </p>
                <p className="text-sm text-muted-foreground">
                  Aramantos Digital provides the technology platform and tools. The outcomes of using these tools,
                  including the accuracy of your content, the legal validity of proofs, and compliance with your
                  local laws, are your responsibility.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Specifically, Aramantos Digital does not guarantee:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>That proofs will be accepted as legal evidence in all jurisdictions</li>
                <li>Uninterrupted or error-free service availability</li>
                <li>The fitness of the Service for any particular legal or regulatory purpose</li>
                <li>That third-party services (blockchain networks, cloud providers) will remain available</li>
              </ul>

              <div className="space-y-4 mt-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">8.1 Timestamp Processing and Blockchain Anchoring</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      There is a processing window between when a file is hashed and when the proof is anchored to the Bitcoin
                      blockchain. During this window, the timestamp depends on the OpenTimestamps calendar server and has not yet
                      been confirmed by the Bitcoin network.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      Once the proof is included in a Bitcoin block, it becomes permanent and independently verifiable without
                      reliance on ProveChain or any third-party service.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      ProveChain is not responsible for delays or failures in the OpenTimestamps calendar server, the Bitcoin
                      network, or any other third-party infrastructure involved in the anchoring process.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">8.2 Proof of Existence vs. Proof of Authorship</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      Blockchain timestamping proves that a specific file existed at a specific time. It does <strong>not</strong> prove
                      who created the file. It only proves that the person who submitted the hash had access to the file at the time of submission.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      A ProveChain timestamp should not be treated as proof of original authorship. The submitter of a hash is not
                      necessarily the original author of the underlying content.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Users should not rely on ProveChain timestamps as sole evidence of authorship in legal proceedings or disputes
                      without corroborating evidence.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  LIMITATION OF LIABILITY
                </p>
                <p className="text-sm text-muted-foreground">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US
                  IN THE 12 MONTHS PRECEDING THE CLAIM, OR €100, WHICHEVER IS LOWER.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We are not liable for any indirect, incidental, consequential, or punitive damages, including lost profits,
                data loss, or business interruption.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Force Majeure</h2>
              <p className="text-muted-foreground leading-relaxed">
                Aramantos Digital is not liable for service interruptions caused by circumstances beyond reasonable
                control, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                <li>Widespread telecommunications or infrastructure failures</li>
                <li>Cyber-attacks or distributed denial-of-service attacks (where reasonable preventive measures were taken)</li>
                <li>Sudden changes in law or regulation that affect service delivery</li>
                <li>Natural disasters</li>
                <li>Failures of third-party services on which the platform depends (such as blockchain networks, cloud infrastructure providers, or payment processors)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">11.1 By You</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You may cancel your subscription anytime from your account dashboard.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">11.2 Founding Member Grace Period</h3>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-primary mb-2">
                      Special Benefit for Early Supporters
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Founding Members have 30 days after cancellation to reactivate at the €5/month rate.
                      After 30 days, resubscription is at the current Professional rate (€9/month or higher).
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Example:</strong> Cancel on Jan 1 → Reactivate by Jan 31 at €5/month → After Jan 31, Professional rate applies.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of Ireland. Disputes will be resolved through good-faith negotiation,
                mediation, or the courts of Ireland.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Legal Entity:</strong> Aramantos Digital</p>
                <p><strong>Email:</strong> <a href="mailto:support@aramantos.dev" className="text-primary hover:underline">support@aramantos.dev</a></p>
              </div>
            </section>

          </div>
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex gap-4 justify-center"
        >
          <Link
            href="/legal/privacy"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/faq"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            FAQ
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
