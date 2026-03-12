-- ============================================================================
-- Restore calculate_user_usage and calculate_team_usage Functions
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix usage statistics by restoring VOID-returning functions that
--          properly insert/update the usage_stats table

-- ============================================================================
-- Fix calculate_user_usage - Restore original VOID-returning version
-- ============================================================================
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

  -- Upsert usage stats
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
  )
  ON CONFLICT (user_id) DO UPDATE SET
    proof_count = v_proof_count,
    proof_version_count = v_version_count,
    tag_count = v_tag_count,
    total_storage_bytes = v_storage_bytes,
    max_proofs = v_max_proofs,
    max_storage_bytes = v_max_storage,
    last_calculated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- Fix calculate_team_usage - Restore original VOID-returning version
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

  -- Upsert usage stats
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
  )
  ON CONFLICT (team_id) DO UPDATE SET
    proof_count = v_proof_count,
    proof_version_count = v_version_count,
    tag_count = v_tag_count,
    total_storage_bytes = v_storage_bytes,
    max_proofs = v_max_proofs,
    max_storage_bytes = v_max_storage,
    last_calculated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Usage calculation functions restored';
  RAISE NOTICE '✓ calculate_user_usage returns VOID and inserts into usage_stats';
  RAISE NOTICE '✓ calculate_team_usage returns VOID and inserts into usage_stats';
  RAISE NOTICE '✓ Both functions have secure search_path set';
END $$;
