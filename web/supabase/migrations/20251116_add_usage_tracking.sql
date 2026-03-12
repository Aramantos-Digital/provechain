-- Migration: Add Usage Tracking for Fair Usage Limits
-- Created: 2025-11-16
-- Purpose: Track storage and proof counts to enforce tier limits

-- ============================================================================
-- USAGE STATISTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Counts
  proof_count INTEGER NOT NULL DEFAULT 0,
  proof_version_count INTEGER NOT NULL DEFAULT 0,
  tag_count INTEGER NOT NULL DEFAULT 0,

  -- Storage (in bytes)
  total_storage_bytes BIGINT NOT NULL DEFAULT 0,

  -- Limits based on tier (null = unlimited)
  max_proofs INTEGER,
  max_storage_bytes BIGINT,

  -- Timestamps
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user or team
  UNIQUE(user_id),
  UNIQUE(team_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_team_id ON usage_stats(team_id);

-- Add comments
COMMENT ON TABLE usage_stats IS 'Usage statistics for enforcing fair usage limits per tier';
COMMENT ON COLUMN usage_stats.proof_count IS 'Number of unique proof groups (not including versions)';
COMMENT ON COLUMN usage_stats.proof_version_count IS 'Total number of proof versions';
COMMENT ON COLUMN usage_stats.total_storage_bytes IS 'Total storage used for proof JSONs';
COMMENT ON COLUMN usage_stats.max_proofs IS 'Maximum proofs allowed (null = unlimited)';
COMMENT ON COLUMN usage_stats.max_storage_bytes IS 'Maximum storage allowed (null = unlimited)';

-- ============================================================================
-- TIER LIMITS (Documentation)
-- ============================================================================
-- Free Tier: 100 proofs, 100MB storage, 24-hour expiry
-- Founder Tier: 1,000 proofs, 1GB storage, lifetime
-- Pro Tier: 1,000 proofs, 1GB storage, lifetime
-- Professional: 10,000 proofs, 10GB storage, lifetime
-- Business: 100,000 proofs, 100GB storage, lifetime
-- Enterprise: Unlimited

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage
CREATE POLICY usage_stats_select_user_policy ON usage_stats
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Team members can view team usage
CREATE POLICY usage_stats_select_team_policy ON usage_stats
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: System can manage usage stats
CREATE POLICY usage_stats_manage_policy ON usage_stats
  FOR ALL
  USING (true);  -- Managed via functions

-- ============================================================================
-- FUNCTION: Calculate User Usage
-- ============================================================================
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
      ELSE 'free'
    END,
    CASE
      WHEN tier = 'free' THEN 100
      WHEN tier IN ('founder', 'pro') THEN 1000
      ELSE NULL
    END,
    CASE
      WHEN tier = 'free' THEN 104857600  -- 100MB
      WHEN tier IN ('founder', 'pro') THEN 1073741824  -- 1GB
      ELSE NULL
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

-- ============================================================================
-- FUNCTION: Calculate Team Usage
-- ============================================================================
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

-- ============================================================================
-- FUNCTION: Check if user can create proof (enforce limits)
-- ============================================================================
CREATE OR REPLACE FUNCTION can_create_proof(p_user_id UUID, p_team_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_stats RECORD;
  v_target_id UUID;
  v_target_column TEXT;
BEGIN
  -- Recalculate usage first
  IF p_team_id IS NOT NULL THEN
    PERFORM calculate_team_usage(p_team_id);
    v_target_id := p_team_id;
    v_target_column := 'team_id';
  ELSE
    PERFORM calculate_user_usage(p_user_id);
    v_target_id := p_user_id;
    v_target_column := 'user_id';
  END IF;

  -- Get usage stats
  IF p_team_id IS NOT NULL THEN
    SELECT * INTO v_stats FROM usage_stats WHERE team_id = p_team_id;
  ELSE
    SELECT * INTO v_stats FROM usage_stats WHERE user_id = p_user_id;
  END IF;

  -- Check proof count limit
  IF v_stats.max_proofs IS NOT NULL AND v_stats.proof_count >= v_stats.max_proofs THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'proof_limit_reached',
      'current', v_stats.proof_count,
      'limit', v_stats.max_proofs,
      'message', format('You have reached your proof limit of %s. Please upgrade your plan.', v_stats.max_proofs)
    );
  END IF;

  -- Check storage limit (estimate ~10KB per proof)
  IF v_stats.max_storage_bytes IS NOT NULL AND (v_stats.total_storage_bytes + 10240) > v_stats.max_storage_bytes THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'storage_limit_reached',
      'current', v_stats.total_storage_bytes,
      'limit', v_stats.max_storage_bytes,
      'message', format('You have reached your storage limit. Please upgrade your plan.')
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'current_proofs', v_stats.proof_count,
    'max_proofs', v_stats.max_proofs,
    'current_storage', v_stats.total_storage_bytes,
    'max_storage', v_stats.max_storage_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CRON JOB: Recalculate usage stats daily
-- ============================================================================
-- This should be called from /api/cron/calculate-usage
-- Run daily to keep stats up to date
