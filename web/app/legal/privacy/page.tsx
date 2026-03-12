'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export default function PrivacyPage() {
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
            <div className="p-4 rounded-2xl bg-green-500/10">
              <Shield className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 pb-1">Privacy Policy</h1>
          <p className="text-muted-foreground mb-6">Last updated: March 12, 2026</p>

          {/* Privacy Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-400">
              Privacy by Design: We never store your file contents
            </span>
          </div>
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
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-green-400 mb-2">
                  KEY PRIVACY PRINCIPLE
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>We never store your file contents.</strong> We only store cryptographic hashes (SHA-256 fingerprints),
                  file/folder names, and account information. Your files stay on your machine (or in your cloud provider).
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">1.1 CLI Tool (Offline)</h3>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-400 mb-2">
                      ✅ ZERO Data Collection
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The CLI tool runs 100% locally. No data is sent to our servers. Hashing and proof generation happen entirely on your machine.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">1.2 Free Tier (Web App)</h3>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-400 mb-2">
                      Minimal Data Collection
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      File hashing happens <strong>locally in your browser</strong>. Your files are never uploaded to our servers. However, when you save a proof, we store:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li><strong>Account Information:</strong> Email address (for authentication)</li>
                      <li><strong>Proof Metadata:</strong> File name(s) or folder name, cryptographic hash, timestamp, file size</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      File and folder names are stored so you can identify your proofs. You can rename these at any time from your dashboard.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">1.3 Paid Tiers (Founding Member, Professional)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    In addition to the data collected for free tier users, paid tiers also involve:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Payment Information:</strong> Processed by Stripe (we do not store card details)</li>
                    <li><strong>Enhanced Proof Metadata:</strong> Descriptions, version notes, blockchain anchoring data</li>
                    <li><strong>Connected Service Data:</strong> For automated proofs (GitHub, OneDrive, Google Drive, Dropbox), file metadata is retrieved from your cloud provider and hashed on our servers. File contents are read only to generate hashes and are never stored.</li>
                    <li><strong>Usage Analytics:</strong> Number of proofs created, subscription status</li>
                  </ul>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                    <p className="text-sm font-semibold text-yellow-400 mb-2">
                      What We DON'T Collect:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>❌ Your source code or file contents</li>
                      <li>❌ Browsing history</li>
                      <li>❌ IP addresses (unless required for fraud prevention)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Your Responsibility: File Preservation</h2>
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  ⚠️ IMPORTANT: ProveChain Stores Hashes, Not Files
                </p>
                <p className="text-sm text-muted-foreground">
                  This is a privacy feature - we never have access to your files. But it means file preservation
                  is entirely <strong>your responsibility</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  <strong>You are solely responsible for:</strong>
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Preserving the original file versions used to create each proof</li>
                  <li>Storing files securely with restricted access</li>
                  <li>Maintaining separate copies for each proof version</li>
                </ul>
                <div className="bg-muted rounded-lg p-4 mt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Without the original files, proofs cannot be verified and have no legal value.</strong> See our
                    Terms of Service (Section 7) for detailed file preservation requirements.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use collected data only to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and improve the Service</li>
                <li>Process payments via Stripe</li>
                <li>Send important account updates (e.g., subscription expiry)</li>
                <li>Respond to support requests</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>We will NEVER:</strong> Sell your data, use it for advertising, or share it with third parties
                beyond the service providers listed in Section 6.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Storage and Security</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">4.1 Encryption</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>In Transit:</strong> All data transmitted via HTTPS (TLS encryption)</li>
                    <li><strong>At Rest:</strong> Proof storage is encrypted at rest by our infrastructure provider (Supabase/AWS)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">4.2 Data Location</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Data is stored on servers within the European Union (EU) to comply with GDPR requirements.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">4.3 Data Retention</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Upon account deletion, proof data is permanently deleted according to your tier:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
                    <li><strong>Free Tier:</strong> Proof data retained for 48 hours after completion, then permanently deleted</li>
                    <li><strong>Individual Tiers (Founding Member, Professional):</strong> Data permanently deleted within 30 days of account deletion</li>
                    <li><strong>Enterprise Tiers (Team, Business, Custom):</strong> Data permanently deleted within 90 days of account deletion</li>
                    <li><strong>Blockchain Data:</strong> Immutable. Hashes anchored to the Bitcoin blockchain remain on-chain permanently and cannot be deleted</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Your GDPR Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you're in the EU, you have the following rights:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Right to Access:</strong> Request a copy of your data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
                <li><strong>Right to Data Portability:</strong> Export your data in JSON format</li>
                <li><strong>Right to Object:</strong> Opt-out of certain data processing</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise any of these rights, email: <a href="mailto:support@aramantos.dev" className="text-primary hover:underline">support@aramantos.dev</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use the following third-party services to operate ProveChain:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-3 ml-4">
                <li><strong>Cloudflare:</strong> DNS management and email routing. All traffic passes through Cloudflare. (see <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cloudflare Privacy Policy</a>)</li>
                <li><strong>Vercel:</strong> Application hosting and CDN. (see <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel Privacy Policy</a>)</li>
                <li><strong>Google Cloud Platform:</strong> Authentication and identity infrastructure. (see <a href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Privacy Notice</a>)</li>
                <li><strong>Supabase:</strong> Database and file storage. (see <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Privacy Policy</a>)</li>
                <li><strong>Stripe:</strong> Payment processing. We do not store card details. (see <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Stripe Privacy Policy</a>)</li>
                <li><strong>Resend:</strong> Transactional email delivery. (see <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend Privacy Policy</a>)</li>
                <li><strong>OpenTimestamps:</strong> Bitcoin blockchain timestamping protocol. OpenTimestamps is open-source and does not collect personal data. Proof hashes are published to the Bitcoin blockchain and are publicly visible and immutable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Cookies and Tracking</h2>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-green-400 mb-2">
                  ✅ NO Tracking Cookies
                </p>
                <p className="text-sm text-muted-foreground">
                  We do not use analytics, advertising, or tracking cookies. The only cookies we use are essential
                  session cookies for authentication (if you're logged in).
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                ProveChain is not intended for users under 18 years old. We do not knowingly collect data from children.
                If you believe a child has provided us with personal information, contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy with 30 days' notice. Material changes will be emailed to all users.
                Continued use of the Service after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Contact Us</h2>
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Data Controller:</strong> Aramantos Digital</p>
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
            href="/legal/terms"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Terms of Service
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
