-- ============================================================================
-- Migration: Create API Keys Table + Upgrade All Users to Enterprise
-- Created: 2025-11-18
-- Purpose:
--   1. Support API key generation and management for Business/Enterprise tiers
--   2. Upgrade all existing users to Enterprise tier for testing
-- ============================================================================

-- ============================================================================
-- PART 1: API KEYS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,  -- First 16 chars for display (e.g., "pk_live_abc12345")
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of full key (never store plaintext!)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),

  -- Metadata
  scopes JSONB DEFAULT '["proofs:create", "proofs:read"]'::jsonb,  -- Future: granular permissions
  rate_limit_tier TEXT DEFAULT 'standard' CHECK (rate_limit_tier IN ('standard', 'elevated', 'unlimited'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);  -- For auth lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

-- Add comments
COMMENT ON TABLE api_keys IS 'API keys for programmatic access (Business/Enterprise tiers)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of full API key - never store plaintext!';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 16 characters for display (e.g., "pk_live_abc12345")';
COMMENT ON COLUMN api_keys.scopes IS 'JSON array of permitted operations (future use)';
COMMENT ON COLUMN api_keys.rate_limit_tier IS 'Rate limiting tier based on subscription';

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own API keys
CREATE POLICY api_keys_select_policy ON api_keys
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own API keys (tier check in application logic)
CREATE POLICY api_keys_insert_policy ON api_keys
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own API keys (revoke, etc.)
CREATE POLICY api_keys_update_policy ON api_keys
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own API keys
CREATE POLICY api_keys_delete_policy ON api_keys
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- PART 3: FUNCTIONS
-- ============================================================================

-- Function to check if user can create API keys (Business/Enterprise tiers only)
CREATE OR REPLACE FUNCTION can_create_api_key(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, message TEXT) AS $$
DECLARE
  v_tier TEXT;
  v_key_count INTEGER;
  v_max_keys INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Default to 'free' if no subscription
  v_tier := COALESCE(v_tier, 'free');

  -- Check if tier allows API keys
  IF v_tier NOT IN ('business', 'enterprise', 'custom') THEN
    RETURN QUERY SELECT FALSE, 'API keys require Business or Enterprise tier';
    RETURN;
  END IF;

  -- Count existing active keys
  SELECT COUNT(*) INTO v_key_count
  FROM api_keys
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Set max keys based on tier
  v_max_keys := CASE
    WHEN v_tier = 'business' THEN 5
    WHEN v_tier IN ('enterprise', 'custom') THEN 25
    ELSE 0
  END;

  -- Check if under limit
  IF v_key_count >= v_max_keys THEN
    RETURN QUERY SELECT FALSE, format('Maximum API keys reached (%s/%s). Revoke unused keys or upgrade.', v_key_count, v_max_keys);
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate API key on request (for API endpoints)
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash TEXT)
RETURNS TABLE(valid BOOLEAN, user_id UUID, tier TEXT) AS $$
DECLARE
  v_key_record RECORD;
BEGIN
  -- Find API key
  SELECT ak.*, s.tier
  INTO v_key_record
  FROM api_keys ak
  LEFT JOIN subscriptions s ON s.user_id = ak.user_id AND s.status = 'active'
  WHERE ak.key_hash = p_key_hash
    AND ak.status = 'active'
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
  LIMIT 1;

  -- Check if found
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE id = v_key_record.id;

  -- Return validation result
  RETURN QUERY SELECT TRUE, v_key_record.user_id, COALESCE(v_key_record.tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION can_create_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION validate_api_key TO anon, authenticated;

-- ============================================================================
-- PART 5: UPGRADE ALL EXISTING USERS TO ENTERPRISE TIER
-- ============================================================================

-- Insert or update subscription for all users
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  tier,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
SELECT
  id AS user_id,
  'manual_' || id AS stripe_customer_id,  -- Fake Stripe ID for manual subs
  'sub_manual_' || id AS stripe_subscription_id,  -- Fake subscription ID
  'enterprise' AS tier,
  'active' AS status,
  NOW() AS current_period_start,
  NOW() + INTERVAL '100 years' AS current_period_end,  -- Never expires
  FALSE AS cancel_at_period_end,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users
ON CONFLICT (user_id)
DO UPDATE SET
  tier = 'enterprise',
  status = 'active',
  current_period_end = NOW() + INTERVAL '100 years',
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION QUERIES (run these to check it worked)
-- ============================================================================

-- Check API keys table exists
-- SELECT COUNT(*) FROM api_keys;

-- Check all users have Enterprise tier
-- SELECT u.email, s.tier, s.status, s.current_period_end
-- FROM auth.users u
-- LEFT JOIN subscriptions s ON s.user_id = u.id
-- ORDER BY u.created_at;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To remove API keys table:
-- DROP TABLE IF EXISTS api_keys CASCADE;
-- DROP FUNCTION IF EXISTS can_create_api_key;
-- DROP FUNCTION IF EXISTS validate_api_key;

-- To reset subscriptions:
-- DELETE FROM subscriptions WHERE stripe_customer_id LIKE 'manual_%';
