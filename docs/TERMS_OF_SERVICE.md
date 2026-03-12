# Terms of Service - ProveChain

**Last Updated:** November 12, 2025
**Effective Date:** November 12, 2025

---

## 1. Acceptance of Terms

By accessing or using ProveChain ("Service"), including our website (provechain.io), CLI tool, web application, or API, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.

---

## 2. Description of Service

ProveChain provides cryptographic proof-of-authorship tools for source code and digital files:

### Free Tier
- **CLI Tool:** Open-source command-line tool (MIT licensed) for local file hashing and proof generation
- **Web UI:** Client-side web application for hashing files in your browser
- **Local Proof Storage:** JSON proof files you download and store yourself

### Paid Tier (€5-€9/month)
- **Cloud Storage:** Store proof files on our servers
- **Public Verification Portal:** Share verification URLs with third parties
- **Blockchain Timestamping:** (Future) Anchor proofs to public blockchains
- **API Access:** Programmatic access to proof management

**The Service uses SHA-256 cryptographic hashing to create timestamped proofs. We do NOT store your source code - only the file hashes and metadata.**

---

## 3. Account Registration (Paid Tier Only)

### 3.1 Account Creation
To access paid features, you must create an account with:
- Valid email address
- Secure password
- Payment information (processed via Stripe)

### 3.2 Account Security
You are responsible for:
- Maintaining confidentiality of your account credentials
- All activities under your account
- Notifying us immediately of unauthorized use

We reserve the right to suspend accounts engaged in fraudulent or abusive activity.

---

## 4. Payment Terms

### 4.1 Pricing
- **Founding Member:** €5/month (first 100 users, locked in forever)
- **Pro:** €9/month (standard)
- **Enterprise:** Custom pricing

Prices are in EUR. All prices exclude VAT (added for EU customers as required by law).

### 4.2 Billing
- Billed monthly via Stripe
- Automatically renews unless cancelled
- No refunds for partial months

### 4.3 Cancellation
You may cancel at any time. Access to paid features ends at the end of your billing period.

### 4.4 Price Changes
We may change pricing with 30 days' notice. **Founding Member pricing is locked and will never increase.**

---

## 5. Acceptable Use

### 5.1 Permitted Use
You may use ProveChain to:
- Create cryptographic proofs of code authorship
- Timestamp software releases
- Prove prior art for patent applications
- Demonstrate contractor deliverables
- Track innovation history

### 5.2 Prohibited Use
You may NOT use ProveChain to:
- ❌ Upload illegal, infringing, defamatory, or harmful content
- ❌ Attempt to reverse engineer, decompile, or hack the Service
- ❌ Use automated tools to create excessive proofs (rate limiting applies)
- ❌ Resell or redistribute the Service without authorization
- ❌ Impersonate others or misrepresent proof authorship
- ❌ Use the Service for illegal timestamping (e.g., backdating documents)

### 5.3 Fair Usage Policy
The Service is subject to fair usage limits:
- **Free Tier:** Unlimited local CLI use, web UI limited to reasonable personal use
- **Paid Tier:** Reasonable storage limits apply (we'll contact you before enforcing limits)

Excessive use that degrades service performance may result in throttling or account suspension.

---

## 6. Intellectual Property

### 6.1 Your Content
You retain all rights to your source code and files. By using ProveChain, you grant us a limited license to:
- Store file hashes (NOT source code) for proof generation
- Display proof metadata in verification portals
- Process your data as necessary to provide the Service

**We do NOT claim ownership of your code or proofs.**

### 6.2 Our IP
ProveChain's CLI tool is open-source (MIT license). The web app, API, and backend services are proprietary and owned by Aramantos.

---

## 7. DATA STORAGE AND BACKUPS

### 7.1 Free Tier (No Cloud Storage)
**You are responsible for storing your own proof files.** We do not store proofs for free tier users. If you lose your proof file, we cannot recover it.

### 7.2 Paid Tier (Cloud Storage)
We store proof files on secure cloud infrastructure (Vercel, Supabase, or similar).

**CRITICAL DISCLAIMER:**

**While we take all reasonable precautions to secure and back up user data, we do not guarantee:**
- ✗ Uninterrupted access to the Service
- ✗ Complete data integrity or zero data loss
- ✗ Permanent storage (we may delete old proofs after account cancellation)

**You are responsible for:**
- ✅ Maintaining your own backups of critical proof files
- ✅ Downloading proofs periodically for local archival
- ✅ Verifying proof integrity after retrieval

**Recommendation:** Download and archive proofs locally as soon as they are created. **Do not rely solely on cloud storage for critical proofs.**

---

## 7A. FILE IMMUTABILITY AND PRESERVATION REQUIREMENTS

**CRITICAL: This section explains requirements for maintaining proof validity.**

### 7A.1 Understanding Proof Immutability
Each cryptographic proof created by ProveChain is **permanently locked** to the **exact file versions** that existed at the moment of proof creation. Proofs use SHA-256 hashing to create unique fingerprints of your files.

**Key Principle:** If you modify, overwrite, rename, or delete the original files, the proof becomes **invalid and cannot be verified**.

### 7A.2 Your Responsibilities
To maintain the legal validity of your proofs, you MUST:

- ✅ **Preserve Original Files:** Keep the exact file versions used to create each proof unchanged and accessible
- ✅ **Store All Versions Separately:** If you have multiple proof versions, you must maintain separate copies of files for each version
- ✅ **Restrict Access:** Store files in secure locations with limited write access to prevent accidental modification
- ✅ **Never Overwrite:** When updating your work, create copies instead of modifying originals
- ✅ **Use Version Control:** Utilize the "New Version" feature instead of editing files in place

### 7A.3 Version Management Examples

**❌ WRONG:** Modifying files after creating a proof
- Create proof of `contract_v1.pdf`
- Edit `contract_v1.pdf` with changes
- **Result:** Original proof is now worthless - cannot be verified

**✅ CORRECT:** Creating new versions
- Create proof of `contract_v1.pdf`
- Save a copy as `contract_v2.pdf`
- Make changes to `contract_v2.pdf`
- Create new proof of `contract_v2.pdf` using "New Version" button
- **Result:** Both proofs remain valid and verifiable

### 7A.4 Consequences of File Modification
If you modify original files after proof creation:

- ❌ The proof hash will not match current file state
- ❌ Verification will fail
- ❌ The proof has **no legal value**
- ❌ You cannot retroactively "fix" the proof
- ❌ We cannot recover or validate modified files

### 7A.5 Our Liability
**ProveChain stores cryptographic hashes only - NOT your actual files.**

We are NOT responsible for:
- ❌ Files you modify, delete, or overwrite
- ❌ Loss of original file versions
- ❌ Failed proof verification due to file changes
- ❌ Legal disputes caused by missing or modified files
- ❌ Your failure to follow file preservation requirements

**You are solely responsible for preserving original files.** Without them, your proofs are worthless.

---

## 8. LIMITATION OF LIABILITY

**THIS IS THE MOST IMPORTANT SECTION. PLEASE READ CAREFULLY.**

### 8.1 No Warranties
THE SERVICE IS PROVIDED **"AS-IS"** AND **"AS AVAILABLE"** WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
- ✗ Merchantability
- ✗ Fitness for a particular purpose
- ✗ Non-infringement
- ✗ Uninterrupted or error-free operation
- ✗ Accuracy, reliability, or completeness of proofs
- ✗ Security of cloud storage

### 8.2 Limitation of Liability
**TO THE MAXIMUM EXTENT PERMITTED BY LAW:**

**WE ARE NOT LIABLE FOR ANY:**
- ✗ **Indirect, incidental, consequential, or punitive damages**
- ✗ **Data loss, corruption, or unavailability**
- ✗ **Lost profits or business interruption**
- ✗ **Loss of goodwill or reputation**
- ✗ **Failure to prove authorship in legal disputes**
- ✗ **Patent application rejections**
- ✗ **Contract invalidation due to failed proof verification**

**OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED:**
**The amount you paid us in the 12 months preceding the claim, or €100, whichever is lower.**

### 8.3 Examples of Non-Liability

**ProveChain is a timestamping tool, NOT legal advice or a guarantee.**

We are NOT liable if:
- ❌ Your proof file is lost, corrupted, or deleted
- ❌ A third party disputes your proof's validity
- ❌ A court rejects your proof as evidence
- ❌ Your patent application is denied despite having proofs
- ❌ You suffer financial loss due to service downtime
- ❌ SHA-256 is broken in the future (cryptographic obsolescence)
- ❌ You use ProveChain as your only proof of authorship (you should use multiple methods)

**USE PROVECHAIN AS ONE PART OF YOUR IP PROTECTION STRATEGY, NOT THE ONLY PART.**

### 8.4 Force Majeure
We are not liable for delays or failures caused by events beyond our control (e.g., natural disasters, cyberattacks, government actions, third-party service outages).

---

## 9. Indemnification

You agree to indemnify and hold harmless Aramantos, its officers, employees, and contractors from any claims, damages, or expenses (including legal fees) arising from:
- Your use of the Service
- Your violation of these Terms
- Your violation of any third-party rights (e.g., copyright infringement)

---

## 10. Termination

### 10.1 By You
You may terminate your account at any time by cancelling your subscription.

### 10.2 By Us
We may suspend or terminate your account if:
- You violate these Terms
- You engage in fraudulent or abusive activity
- You fail to pay fees
- Required by law

### 10.3 Effect of Termination
Upon termination:
- Access to paid features ends immediately
- We may delete your cloud-stored proofs after 90 days (download them first!)
- Free tier CLI/web UI remains available

### 10.4 Founding Member Grace Period
**Special benefit for early supporters:**

If you subscribed as a **Founding Member** (€5/month locked rate for first 100 users), you have a **30-day grace period** after cancellation:

- ✅ Within 30 days of cancelling, you may reactivate your subscription at the original €5/month Founding Member rate
- ✅ After 30 days, you may still resubscribe, but at the current Pro rate (€9/month or higher)
- ✅ Your Founding Member status is tracked by your original signup email address

**Example:**
- You cancel on January 1st
- You can reactivate at €5/month until January 31st (30 days)
- After January 31st, you'll need to subscribe at the standard Pro rate

This grace period is our way of thanking early supporters for believing in ProveChain.

---

## 11. Privacy and Data Protection

Your use of ProveChain is subject to our **Privacy Policy** (see separate document).

**Key points:**
- We collect minimal data (email, proof metadata, payment info)
- We do NOT store your source code (only file hashes)
- We comply with GDPR (EU users have right to access, deletion, portability)
- We encrypt data in transit (HTTPS) and at rest

---

## 12. Changes to Terms

We may update these Terms with 30 days' notice. Continued use of the Service after changes constitutes acceptance.

**Critical changes (e.g., price increases, liability changes) will be emailed to all users.**

---

## 13. Governing Law and Disputes

### 13.1 Governing Law
These Terms are governed by the laws of **Ireland** (where Aramantos is registered).

### 13.2 Dispute Resolution
Any disputes will be resolved through:
1. Good-faith negotiation (30 days)
2. Mediation (if negotiation fails)
3. Courts of Ireland (final resort)

---

## 14. Severability

If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect.

---

## 15. Contact Information

**Legal Entity:** Aramantos (Sole Trader)
**Registered Address:** [Your Address - Add when registering with CRO]
**Email:** legal@aramantos.dev
**Website:** [provechain.io](https://provechain.io)

**For support questions:** support@aramantos.dev
**For legal/privacy questions:** legal@aramantos.dev

---

## 16. Acknowledgment

**BY USING PROVECHAIN, YOU ACKNOWLEDGE THAT:**

1. ✅ You have read and understood these Terms
2. ✅ ProveChain is a timestamping tool, NOT a legal guarantee
3. ✅ You are responsible for backing up your own proof files
4. ✅ **You must preserve original file versions to maintain proof validity (see Section 7A)**
5. ✅ **Modifying original files after proof creation invalidates the proof**
6. ✅ We have limited liability (see Section 8)
7. ✅ You should use multiple IP protection methods, not just ProveChain
8. ✅ Cryptographic proofs may not be accepted as evidence in all jurisdictions
9. ✅ You are using the Service at your own risk

---

**Last Updated:** November 12, 2025

**Questions?** Email legal@aramantos.dev

---

**MIT License (CLI Tool):**
The ProveChain CLI is open-source under the MIT License. See [LICENSE file](https://github.com/aramantos/provechain/blob/main/LICENSE).

**Proprietary (Web UI, API, Backend):**
The ProveChain web application, API, and backend services are proprietary and subject to these Terms.

---
