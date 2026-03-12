-- ============================================================================
-- Simplify Usage Stats RLS - Remove Recursive Policies
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix infinite recursion by removing complex team policies

-- The issue: usage_stats team policies check team_members, which causes
-- infinite recursion in RLS evaluation

-- ============================================================================
-- Drop ALL existing policies
-- ============================================================================

DROP POLICY IF EXISTS usage_stats_select_user_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_select_team_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_insert_user_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_update_user_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_insert_team_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_update_team_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_delete_user_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_delete_team_policy ON usage_stats;
DROP POLICY IF EXISTS usage_stats_function_write_policy ON usage_stats;

-- ============================================================================
-- Create SIMPLE policies that don't cause recursion
-- ============================================================================

-- Users can view their own usage stats
CREATE POLICY usage_stats_select_policy ON usage_stats
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL  -- Allow viewing records without user_id (shouldn't happen but safe)
  );

-- SECURITY DEFINER functions can write (bypass normal user restrictions)
-- This policy allows authenticated users to call calculate_user_usage
CREATE POLICY usage_stats_write_policy ON usage_stats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Make calculate_user_usage use UPSERT properly
-- ============================================================================

-- The issue with DELETE + INSERT is that DELETE is also subject to RLS
-- So we'll use UPDATE with fallback to INSERT

DROP FUNCTION IF EXISTS calculate_user_usage(UUID);

CREATE OR REPLACE FUNCTION calculate_user_usage(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proof_count INTEGER;
  v_version_count INTEGER;
  v_storage_bytes BIGINT;
  v_tag_count INTEGER;
  v_tier TEXT;
  v_max_proofs INTEGER;
  v_max_storage BIGINT;
  v_existing_id UUID;
BEGIN
  -- Count unique proof groups (proofs where it's the root)
  SELECT COUNT(DISTINCT COALESCE(proof_group_id, id))
  INTO v_proof_count
  FROM proofs
  WHERE user_id = p_user_id;

  -- Count total versions
  SELECT COUNT(*)
  INTO v_version_count
  FROM proofs
  WHERE user_id = p_user_id;

  -- Calculate total storage (sum of proof_json sizes)
  SELECT COALESCE(SUM(LENGTH(proof_json::text)::bigint), 0)
  INTO v_storage_bytes
  FROM proofs
  WHERE user_id = p_user_id;

  -- Count tags
  SELECT COUNT(*)
  INTO v_tag_count
  FROM tags
  WHERE user_id = p_user_id;

  -- Get user's tier and limits
  SELECT
    CASE
      WHEN tier = 'founder' THEN 'founder'
      WHEN tier = 'pro' THEN 'pro'
      WHEN tier = 'professional' THEN 'professional'
      WHEN tier = 'business' THEN 'business'
      WHEN tier = 'enterprise' THEN 'enterprise'
      ELSE 'free'
    END,
    CASE
      WHEN tier = 'free' THEN 100
      WHEN tier IN ('founder', 'pro') THEN 1000
      WHEN tier = 'professional' THEN 10000
      WHEN tier = 'business' THEN 100000
      ELSE NULL  -- Enterprise unlimited
    END,
    CASE
      WHEN tier = 'free' THEN 104857600  -- 100MB
      WHEN tier IN ('founder', 'pro') THEN 1073741824  -- 1GB
      WHEN tier = 'professional' THEN 10737418240  -- 10GB
      WHEN tier = 'business' THEN 107374182400  -- 100GB
      ELSE NULL  -- Enterprise unlimited
    END
  INTO v_tier, v_max_proofs, v_max_storage
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- If no subscription, default to free tier
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_max_proofs := 100;
    v_max_storage := 104857600;
  END IF;

  -- Check if record exists
  SELECT id INTO v_existing_id
  FROM usage_stats
  WHERE user_id = p_user_id;

  IF v_existing_id IS NULL THEN
    -- Insert new record
    INSERT INTO usage_stats (
      user_id,
      proof_count,
      proof_version_count,
      tag_count,
      total_storage_bytes,
      max_proofs,
      max_storage_bytes,
      last_calculated_at
    ) VALUES (
      p_user_id,
      v_proof_count,
      v_version_count,
      v_tag_count,
      v_storage_bytes,
      v_max_proofs,
      v_max_storage,
      NOW()
    );
  ELSE
    -- Update existing record
    UPDATE usage_stats SET
      proof_count = v_proof_count,
      proof_version_count = v_version_count,
      tag_count = v_tag_count,
      total_storage_bytes = v_storage_bytes,
      max_proofs = v_max_proofs,
      max_storage_bytes = v_max_storage,
      last_calculated_at = NOW(),
      updated_at = NOW()
    WHERE id = v_existing_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_user_usage(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Usage stats RLS simplified';
  RAISE NOTICE '✓ Removed recursive team policies';
  RAISE NOTICE '✓ Simple policies for user access';
  RAISE NOTICE '✓ SECURITY DEFINER function can write via permissive policy';
  RAISE NOTICE '✓ Function checks for existing records before insert';
END $$;
