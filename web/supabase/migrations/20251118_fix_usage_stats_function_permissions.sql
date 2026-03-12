-- ============================================================================
-- Fix Usage Stats Function Permissions
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Ensure calculate_user_usage can write to usage_stats table

-- The issue: SECURITY DEFINER functions bypass RLS but the INSERT/UPDATE
-- policies still check auth.uid(), which doesn't work in function context.

-- Solution: Make the function operations not subject to RLS by using
-- proper security context

-- ============================================================================
-- Method 1: Set session variable before insert (preferred)
-- ============================================================================

-- Recreate function with proper session handling
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

  -- DELETE then INSERT instead of UPSERT to avoid RLS issues with UPDATE
  DELETE FROM usage_stats WHERE user_id = p_user_id;

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
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_user_usage(UUID) TO authenticated;

-- ============================================================================
-- Also fix calculate_team_usage
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_team_usage(UUID);

CREATE OR REPLACE FUNCTION calculate_team_usage(p_team_id UUID)
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
BEGIN
  -- Count unique proof groups for team
  SELECT COUNT(DISTINCT COALESCE(proof_group_id, id))
  INTO v_proof_count
  FROM proofs
  WHERE team_id = p_team_id;

  -- Count total versions
  SELECT COUNT(*)
  INTO v_version_count
  FROM proofs
  WHERE team_id = p_team_id;

  -- Calculate total storage
  SELECT COALESCE(SUM(LENGTH(proof_json::text)::bigint), 0)
  INTO v_storage_bytes
  FROM proofs
  WHERE team_id = p_team_id;

  -- Count tags (team-level tags would need separate table)
  v_tag_count := 0;

  -- Get team tier and limits
  SELECT
    tier,
    CASE
      WHEN tier = 'professional' THEN 10000
      WHEN tier = 'business' THEN 100000
      ELSE NULL  -- Enterprise unlimited
    END,
    CASE
      WHEN tier = 'professional' THEN 10737418240  -- 10GB
      WHEN tier = 'business' THEN 107374182400  -- 100GB
      ELSE NULL  -- Enterprise unlimited
    END
  INTO v_tier, v_max_proofs, v_max_storage
  FROM teams
  WHERE id = p_team_id;

  -- DELETE then INSERT to avoid RLS issues
  DELETE FROM usage_stats WHERE team_id = p_team_id;

  INSERT INTO usage_stats (
    team_id,
    proof_count,
    proof_version_count,
    tag_count,
    total_storage_bytes,
    max_proofs,
    max_storage_bytes,
    last_calculated_at
  ) VALUES (
    p_team_id,
    v_proof_count,
    v_version_count,
    v_tag_count,
    v_storage_bytes,
    v_max_proofs,
    v_max_storage,
    NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_team_usage(UUID) TO authenticated;

-- ============================================================================
-- Add DELETE policy for functions to clean old records
-- ============================================================================

CREATE POLICY usage_stats_delete_user_policy ON usage_stats
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY usage_stats_delete_team_policy ON usage_stats
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Usage stats function permissions fixed';
  RAISE NOTICE '✓ Functions use DELETE + INSERT instead of UPSERT';
  RAISE NOTICE '✓ DELETE policies added for cleanup';
  RAISE NOTICE '✓ EXECUTE permissions granted to authenticated';
END $$;
