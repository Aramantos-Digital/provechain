# Privacy Policy - ProveChain

**Last Updated:** November 12, 2025
**Effective Date:** November 12, 2025

---

## 1. Introduction

Aramantos ("we", "our", "us") operates ProveChain, a cryptographic proof-of-authorship service.

This Privacy Policy explains:
- What data we collect
- Why we collect it
- How we use it
- Your rights under GDPR

**Key Privacy Principle: We do NOT store your source code. We only store file hashes, metadata, and account information.**

---

## 2. Data Controller

**Legal Entity:** Aramantos (Sole Trader)
**Registered Address:** [Your Address - Add when registering with CRO]
**Email:** privacy@aramantos.dev
**Data Protection Contact:** legal@aramantos.dev

For EU users, we are the **Data Controller** under GDPR (Regulation (EU) 2016/679).

---

## 3. What Data We Collect

### 3.1 Free Tier (CLI + Web UI)

**We collect ZERO data for free tier users.**

- ✅ **CLI Tool:** 100% local. No data sent to our servers.
- ✅ **Web UI:** Client-side hashing only. Files never leave your browser.

**Your files, hashes, and proofs stay on your device.**

### 3.2 Paid Tier (Cloud Storage)

When you create an account and subscribe to a paid plan, we collect:

| Data Type | Examples | Purpose |
|-----------|----------|---------|
| **Account Information** | Email address, name (optional) | Account creation, communication |
| **Authentication Data** | Password (hashed), OAuth tokens (if using GitHub/Google login) | Secure access |
| **Payment Information** | Billing address, last 4 digits of card | Payments (processed by Stripe) |
| **Proof Metadata** | Proof ID, timestamp, description, file count | Proof storage and retrieval |
| **File Hashes** | SHA-256 hashes of your files (NOT the files themselves) | Proof generation and verification |
| **Usage Data** | Number of proofs created, API calls, storage used | Service performance, abuse prevention |
| **Technical Data** | IP address, browser type, device type | Security, analytics |

### 3.3 What We Do NOT Collect

We do NOT collect or store:
- ❌ **Your source code or file contents** (only SHA-256 hashes)
- ❌ **File names or paths** (unless you include them in proof descriptions)
- ❌ **Detailed analytics or tracking cookies** (we use minimal, privacy-respecting analytics)
- ❌ **Social media data** (unless you use OAuth login - see Section 5.3)

### 3.4 Your Responsibility: File Preservation

**IMPORTANT:** ProveChain stores only cryptographic hashes, NOT your actual files.

**You are solely responsible for:**
- ✅ Preserving the original file versions used to create each proof
- ✅ Storing files securely with restricted access
- ✅ Maintaining separate copies for each proof version

**Without the original files, proofs cannot be verified and have no legal value.** See our Terms of Service (Section 7A) for detailed file preservation requirements.

This is a privacy feature - we never have access to your files. But it means **file preservation is entirely your responsibility.**

---

## 4. Why We Collect Data (Legal Basis)

Under GDPR, we must have a legal basis for processing your data:

| Data | Legal Basis | Explanation |
|------|-------------|-------------|
| Email, password | **Contractual Necessity** | Required to provide the Service (GDPR Art. 6(1)(b)) |
| Payment info | **Contractual Necessity** | Required for billing (GDPR Art. 6(1)(b)) |
| Proof metadata, file hashes | **Contractual Necessity** | Core service functionality (GDPR Art. 6(1)(b)) |
| IP address, usage data | **Legitimate Interest** | Security, fraud prevention, service improvement (GDPR Art. 6(1)(f)) |
| Marketing emails | **Consent** | Only if you opt in (GDPR Art. 6(1)(a)) |

**You can withdraw consent at any time** by emailing privacy@aramantos.dev.

---

## 5. How We Use Your Data

### 5.1 Primary Uses
- ✅ **Provide the Service:** Store proofs, generate verification URLs, process API requests
- ✅ **Account Management:** Authentication, password resets, subscription management
- ✅ **Billing:** Process payments, send invoices
- ✅ **Communication:** Service updates, security alerts, support responses

### 5.2 Secondary Uses (with safeguards)
- ✅ **Security:** Detect fraud, abuse, unauthorized access
- ✅ **Analytics:** Understand usage patterns to improve the Service (aggregated, anonymized data only)
- ✅ **Legal Compliance:** Respond to legal requests, enforce Terms of Service

### 5.3 What We Do NOT Do
- ❌ **Sell your data** to third parties
- ❌ **Share your data** with advertisers
- ❌ **Use your data** for AI training without explicit consent
- ❌ **Track you** across the web (no cross-site tracking)

---

## 6. Who We Share Data With

We share data with trusted third-party processors **ONLY as necessary to provide the Service**:

| Third Party | Data Shared | Purpose | Location |
|-------------|-------------|---------|----------|
| **Stripe** | Email, billing address, payment info | Payment processing | USA (GDPR-compliant via Standard Contractual Clauses) |
| **Vercel** | Technical data (IP, request logs) | Web hosting | Global CDN (GDPR-compliant) |
| **Supabase** | Account info, proof metadata, file hashes | Database hosting | EU region (Ireland) |
| **Plausible Analytics** (if used) | Anonymized usage data (no cookies) | Privacy-respecting analytics | EU (GDPR-compliant) |

**All processors are GDPR-compliant** and bound by Data Processing Agreements (DPAs).

### 6.1 Legal Disclosures
We may disclose data if required by law (e.g., court order, tax authority request, GDPR Data Protection Commission investigation).

**We will notify you** of legal requests unless prohibited by law.

---

## 7. Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| **Account information** | Until account deletion | Service provision |
| **Proof metadata, file hashes** | Until account deletion, or 90 days after subscription ends | Service provision, backups |
| **Payment records** | 7 years | Irish tax law (Revenue Commissioners requirement) |
| **Support emails** | 3 years | Legal compliance, dispute resolution |
| **Anonymized analytics** | 2 years | Service improvement |

**After deletion:** Data is permanently removed from live systems. Backups may retain data for up to 90 days, then are overwritten.

---

## 8. Your Rights Under GDPR

### 8.1 Right to Access (GDPR Art. 15)
You can request a copy of all data we hold about you.

**How:** Email privacy@aramantos.dev with subject "GDPR Access Request"
**Timeline:** We respond within 30 days
**Format:** JSON export of your account data

### 8.2 Right to Rectification (GDPR Art. 16)
You can correct inaccurate data.

**How:** Update your account settings, or email privacy@aramantos.dev

### 8.3 Right to Erasure / "Right to be Forgotten" (GDPR Art. 17)
You can request deletion of your data.

**How:**
1. Cancel your subscription
2. Email privacy@aramantos.dev with subject "Delete My Account"
3. Confirm identity (security check)
4. We delete all data within 30 days (except legally required payment records)

**Effect:** All proofs, metadata, and account info deleted. Cannot be recovered.

### 8.4 Right to Data Portability (GDPR Art. 20)
You can export your data in a machine-readable format.

**How:** Email privacy@aramantos.dev with subject "Data Export Request"
**Format:** JSON file containing all your proofs, metadata, and account info

### 8.5 Right to Object (GDPR Art. 21)
You can object to processing based on "legitimate interest" (e.g., analytics).

**How:** Email privacy@aramantos.dev - we will stop processing unless we have compelling legal grounds

### 8.6 Right to Restrict Processing (GDPR Art. 18)
You can request temporary suspension of processing (e.g., during a dispute).

**How:** Email privacy@aramantos.dev

### 8.7 Right to Withdraw Consent (GDPR Art. 7(3))
If you opted into marketing emails, you can unsubscribe anytime.

**How:** Click "unsubscribe" in any marketing email, or email privacy@aramantos.dev

### 8.8 Right to Lodge a Complaint
If you believe we've violated GDPR, you can complain to:

**Irish Data Protection Commission (DPC)**
- Website: [dataprotection.ie](https://www.dataprotection.ie)
- Email: info@dataprotection.ie
- Phone: +353 57 868 4800

---

## 9. Data Security

We implement industry-standard security measures:

### 9.1 Encryption
- ✅ **In Transit:** HTTPS/TLS 1.3 for all web traffic
- ✅ **At Rest:** AES-256 encryption for database storage
- ✅ **Passwords:** Bcrypt hashing (never stored in plaintext)

### 9.2 Access Controls
- ✅ **Principle of least privilege:** Employees access only necessary data
- ✅ **Two-factor authentication (2FA):** Required for admin accounts
- ✅ **Audit logs:** All data access logged and monitored

### 9.3 Backups
- ✅ **Daily backups** to geographically separate locations
- ✅ **Encrypted backups** (same AES-256 standard)
- ✅ **90-day retention** (then securely deleted)

### 9.4 Incident Response
In case of a data breach:
1. **Containment:** Immediate isolation of affected systems
2. **Assessment:** Determine scope and severity
3. **Notification:** If high risk to your rights, we notify you **within 72 hours** (GDPR requirement)
4. **DPC Notification:** We report to Data Protection Commission within 72 hours (GDPR requirement)
5. **Remediation:** Fix vulnerability, implement safeguards

**Report a suspected breach:** security@aramantos.dev

---

## 10. International Data Transfers

### 10.1 EU Users
Your data is primarily stored in **EU data centers** (Ireland via Supabase).

### 10.2 Third-Party Processors in USA (e.g., Stripe)
When we transfer data to USA-based processors:
- ✅ **Standard Contractual Clauses (SCCs):** Approved by EU Commission
- ✅ **GDPR-compliant DPAs:** All processors contractually bound
- ✅ **Stripe specific:** Certified under EU-US Data Privacy Framework

### 10.3 No Data Transfers to Non-Compliant Countries
We do NOT transfer data to countries without adequate GDPR protections.

---

## 11. Children's Privacy

ProveChain is NOT intended for children under 16 (GDPR age of consent in Ireland).

We do NOT knowingly collect data from children. If you believe a child has created an account, email privacy@aramantos.dev and we will delete it immediately.

---

## 12. Cookies and Tracking

### 12.1 Essential Cookies
We use minimal cookies for functionality:
- **Session cookies:** Keep you logged in (deleted when you close browser)
- **Authentication tokens:** Secure API access (expires after 7 days)

### 12.2 Analytics (Privacy-Respecting)
If we use analytics, we use **Plausible Analytics** (not Google Analytics):
- ✅ **No cookies**
- ✅ **No cross-site tracking**
- ✅ **No personal data collection**
- ✅ **GDPR-compliant by design**

### 12.3 No Third-Party Tracking
We do NOT use:
- ❌ Google Analytics
- ❌ Facebook Pixel
- ❌ Ad trackers
- ❌ Cross-site cookies

---

## 13. Changes to This Policy

We may update this Privacy Policy to reflect:
- New features (e.g., blockchain timestamping)
- Legal requirements
- User feedback

**How we notify you:**
- ✅ **Email notification** for significant changes
- ✅ **Updated "Last Modified" date** at top of this page
- ✅ **30 days' notice** before changes take effect

Continued use after changes = acceptance. If you disagree, you can delete your account.

---

## 14. Contact Us

### 14.1 Privacy Questions
**Email:** privacy@aramantos.dev
**Response Time:** 48 hours for general questions, 30 days for GDPR requests

### 14.2 Data Protection Officer (DPO)
**As a sole trader**, we are NOT required to appoint a formal DPO. However, all privacy matters are handled by:

**Name:** John Doyle
**Email:** legal@aramantos.dev

### 14.3 Mailing Address
[Your Address - Add when you register with CRO]

---

## 15. GDPR Compliance Summary

**We are fully GDPR-compliant:**

| GDPR Requirement | ProveChain Compliance |
|------------------|---------------------|
| **Lawful basis for processing** | ✅ Contractual necessity + Legitimate interest |
| **Explicit consent (where required)** | ✅ Opt-in for marketing emails |
| **Right to access** | ✅ Email privacy@aramantos.dev |
| **Right to deletion** | ✅ Delete account = all data deleted |
| **Right to portability** | ✅ JSON export available |
| **Right to object** | ✅ Email privacy@aramantos.dev |
| **Data minimization** | ✅ We collect only necessary data |
| **Encryption** | ✅ HTTPS + AES-256 at rest |
| **Breach notification (72 hours)** | ✅ Automated process in place |
| **DPA with processors** | ✅ Stripe, Vercel, Supabase all GDPR-compliant |
| **EU data residency** | ✅ Primary storage in Ireland |

---

## 16. California Privacy Rights (CCPA)

If you are a California resident, you have additional rights under CCPA:
- Right to know what data we collect
- Right to delete your data
- Right to opt out of "sale" of data (**we do NOT sell data**)

**Exercise rights:** Email privacy@aramantos.dev with subject "CCPA Request"

---

**Last Updated:** November 12, 2025

**Questions?** Email privacy@aramantos.dev

---

🔒 **Privacy by Design**
ProveChain is built with privacy as a core principle. We collect minimal data, encrypt everything, and give you full control.

---
