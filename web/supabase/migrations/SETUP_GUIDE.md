# ProveChain Subscription & Expiry Setup Guide

This guide walks through setting up the subscription system with automatic proof expiry for free tier users.

## Overview

**Features:**
- ✅ Free tier: 24-hour proof expiry
- ✅ Paid tier: Lifetime storage
- ✅ Canceled subscriptions: 30-day grace period
- ✅ Automatic cleanup of expired proofs
- ✅ Email notifications (to be implemented)

---

## Database Migrations

Run these migrations in order:

### 1. Create Subscriptions Table (003)
```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: 003_create_subscriptions_table.sql
```

**What it does:**
- Creates `subscriptions` table
- Auto-creates free tier subscription for new users
- Backfills existing users with free tier

### 2. Add Expiry to Proofs (004)
```bash
# Run: 004_add_expiry_to_proofs.sql
```

**What it does:**
- Adds `expires_at`, `description`, `expiry_email_sent_at` columns
- Creates trigger to set 24-hour expiry for free tier
- Creates function `delete_expired_proofs()`

### 3. Setup Cron Cleanup (005)
```bash
# Run: 005_setup_cron_cleanup.sql
```

**What it does:**
- Schedules hourly cron job to delete expired proofs
- Note: `pg_cron` may not be available on free tier

---

## Environment Variables

Add these to your `.env.local`:

```bash
# Stripe Webhook (required)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Supabase Service Role (required for webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Secret (optional but recommended)
CRON_SECRET=your_random_secret_here

# Email (optional - for notifications)
# RESEND_API_KEY=re_xxxxx
# EMAIL_FROM=noreply@provechain.io
```

---

## Stripe Webhook Setup

### 1. Test Mode (Development)

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### 2. Production Mode

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Cron Job Setup

You have two options:

### Option 1: Supabase pg_cron (Recommended)

The migration `005_setup_cron_cleanup.sql` automatically sets this up if your Supabase plan supports it.

**Verify it's running:**
```sql
SELECT * FROM cron.job WHERE jobname = 'delete-expired-proofs';
```

### Option 2: Vercel Cron (Fallback)

If pg_cron isn't available:

1. Deploy to Vercel
2. The `vercel.json` is already configured
3. Vercel will automatically call `/api/cron/cleanup-proofs` every hour

**Manual trigger (for testing):**
```bash
curl -X POST https://your-domain.com/api/cron/cleanup-proofs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Testing the Flow

### Test Free Tier Expiry

1. Sign up as a new user
2. Create a proof
3. Check database:
   ```sql
   SELECT file_name, expires_at FROM proofs WHERE user_id = 'your_user_id';
   ```
4. Should show `expires_at = created_at + 24 hours`

### Test Paid Upgrade

1. Subscribe via `/pricing` page
2. Stripe webhook triggers
3. Check database:
   ```sql
   SELECT tier, status FROM subscriptions WHERE user_id = 'your_user_id';
   ```
4. Should show `tier = 'paid'`, `status = 'active'`
5. All existing proofs should have `expires_at = NULL`

### Test Cancellation

1. Cancel subscription in Stripe
2. Wait for billing period to end
3. Webhook triggers `customer.subscription.deleted`
4. Check database:
   ```sql
   SELECT tier, status, proofs_expire_at FROM subscriptions WHERE user_id = 'your_user_id';
   ```
5. Should show:
   - `tier = 'free'`
   - `status = 'canceled'`
   - `proofs_expire_at = NOW() + 30 days`
6. All proofs should have `expires_at = NOW() + 30 days`

### Test Auto-Cleanup

```sql
-- Manually trigger cleanup
SELECT delete_expired_proofs();

-- Or call API
curl -X POST https://your-domain.com/api/cron/cleanup-proofs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Email Notifications (To Be Implemented)

### Planned Email Flow

**Free Tier:**
- 4 hours after first proof → "Free tier - proofs expire in 20 hours"

**Canceled Subscription:**
1. Immediate → "Subscription ended - proofs expire in 30 days"
2. Day 20 → "Reminder: 10 days remaining"
3. Day 29 → "Final warning: 24 hours remaining"

### Email Service Options

**Option A: Resend (Recommended)**
```bash
npm install resend
```

**Option B: SendGrid**
```bash
npm install @sendgrid/mail
```

**Option C: Supabase Auth (Built-in)**
Use Supabase's email templates (limited customization)

---

## Dashboard UI Updates

The dashboard now shows:

### Protected Card (Top Right)
- **Paid + Active:** "Protected - Lifetime" (green)
- **Free Tier:** "Free Tier - 24h Expiry" (yellow) + Upgrade button
- **Canceled:** Shows countdown timer (red) + Warning message

### Individual Proof Cards
- Shows "Expires in Xh Ym" badge
- Red badge if < 4 hours remaining
- Yellow badge otherwise

---

## Troubleshooting

### Webhook not triggering

1. Check Stripe webhook logs
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check Vercel deployment logs
4. Test with Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

### Cron not running

1. Check if pg_cron is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
2. If not available, rely on Vercel Cron
3. Check Vercel Cron logs in dashboard

### Proofs not expiring

1. Check trigger is created:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'set_proof_expiry_on_insert';
   ```
2. Manually test:
   ```sql
   -- Set a proof to expire now
   UPDATE proofs SET expires_at = NOW() - interval '1 hour' WHERE id = 'proof_id';

   -- Run cleanup
   SELECT delete_expired_proofs();
   ```

---

## Next Steps

1. ✅ Run all database migrations
2. ✅ Configure Stripe webhooks
3. ✅ Set up cron job (pg_cron or Vercel)
4. ✅ Test all flows (free, paid, canceled)
5. ⏳ Implement email notifications
6. ⏳ Add email templates
7. ⏳ Set up monitoring/alerting

---

**Questions?** Check the code comments or reach out to the team.
