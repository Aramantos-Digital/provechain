-- ============================================================================
-- Update Subscriptions Tier Constraint
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Update the tier check constraint to allow all new tier values

-- The original table only allowed 'free' and 'paid'
-- We now need: free, founder, pro, professional, business, enterprise

-- ============================================================================
-- Drop the old constraint and add the new one
-- ============================================================================

ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_tier_check
CHECK (tier IN ('free', 'founder', 'pro', 'professional', 'business', 'enterprise'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Subscription tier constraint updated';
  RAISE NOTICE '✓ Allowed tiers: free, founder, pro, professional, business, enterprise';
END $$;
