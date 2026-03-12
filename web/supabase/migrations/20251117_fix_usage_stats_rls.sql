-- Migration: Fix usage_stats RLS policies
-- Created: 2025-11-17
-- Purpose: Fix 406 errors by correcting RLS policies on usage_stats table

-- ============================================================================
-- FIX TABLE STRUCTURE
-- ============================================================================

-- Make user_id nullable since team stats don't have a user_id
ALTER TABLE usage_stats ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id or team_id is set (but not both)
ALTER TABLE usage_stats DROP CONSTRAINT IF EXISTS usage_stats_user_or_team_check;
ALTER TABLE usage_stats ADD CONSTRAINT usage_stats_user_or_team_check
  CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  );

-- ============================================================================
-- DROP CONFLICTING POLICIES
-- ============================================================================

-- Drop the overly broad manage policy
DROP POLICY IF EXISTS usage_stats_manage_policy ON usage_stats;

-- ============================================================================
-- ADD PROPER POLICIES
-- ============================================================================

-- Policy: Users can INSERT their own usage stats (for initial creation)
CREATE POLICY usage_stats_insert_user_policy ON usage_stats
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can UPDATE their own usage stats
CREATE POLICY usage_stats_update_user_policy ON usage_stats
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Team members can INSERT team usage stats
CREATE POLICY usage_stats_insert_team_policy ON usage_stats
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Team members can UPDATE team usage stats
CREATE POLICY usage_stats_update_team_policy ON usage_stats
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Note: DELETE is intentionally not allowed for users
-- Usage stats should only be deleted when user/team is deleted (CASCADE)

-- ============================================================================
-- ENSURE ALL USERS HAVE USAGE STATS
-- ============================================================================

-- Create initial usage_stats for all users who don't have one
-- This prevents 406 errors when accessing the admin page
INSERT INTO usage_stats (user_id, proof_count, proof_version_count, tag_count, total_storage_bytes, max_proofs, max_storage_bytes)
SELECT
  u.id as user_id,
  0 as proof_count,
  0 as proof_version_count,
  0 as tag_count,
  0 as total_storage_bytes,
  100 as max_proofs,
  104857600 as max_storage_bytes  -- 100MB for free tier
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM usage_stats WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- UPDATE CALCULATE FUNCTIONS TO USE BYPASSING RLS
-- ============================================================================

-- Update calculate_user_usage to bypass RLS
CREATE OR REPLACE FUNCTION calculate_user_usage(p_user_id UUID)
RETURNS VOID AS $$
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
      WHEN tier = 'custom' THEN 'custom'
      ELSE 'free'
    END,
    CASE
      WHEN tier = 'free' THEN 100
      WHEN tier IN ('founder', 'pro') THEN 1000
      WHEN tier = 'professional' THEN 10000
      WHEN tier = 'business' THEN 100000
      ELSE NULL  -- Enterprise/Custom unlimited
    END,
    CASE
      WHEN tier = 'free' THEN 104857600  -- 100MB
      WHEN tier IN ('founder', 'pro') THEN 1073741824  -- 1GB
      WHEN tier = 'professional' THEN 10737418240  -- 10GB
      WHEN tier = 'business' THEN 107374182400  -- 100GB
      ELSE NULL  -- Enterprise/Custom unlimited
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_user_usage(UUID) TO authenticated;

-- Update calculate_team_usage similarly
CREATE OR REPLACE FUNCTION calculate_team_usage(p_team_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_team_usage(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY usage_stats_select_user_policy ON usage_stats IS 'Users can view their own usage statistics';
COMMENT ON POLICY usage_stats_select_team_policy ON usage_stats IS 'Team members can view team usage statistics';
COMMENT ON POLICY usage_stats_insert_user_policy ON usage_stats IS 'Users can create their own usage stats';
COMMENT ON POLICY usage_stats_update_user_policy ON usage_stats IS 'Users can update their own usage stats';
COMMENT ON POLICY usage_stats_insert_team_policy ON usage_stats IS 'Team members can create team usage stats';
COMMENT ON POLICY usage_stats_update_team_policy ON usage_stats IS 'Team members can update team usage stats';
