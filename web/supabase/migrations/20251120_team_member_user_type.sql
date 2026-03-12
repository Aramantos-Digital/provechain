-- ============================================================================
-- Team Member User Type
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Create special user type for free tier users who are team members
--
-- Problem: Free tier users on teams have 24-hour proof expiry
--          This makes team collaboration impossible
--
-- Solution: "team_member" user type with pro-tier proof access
--          - No proof expiry
--          - 25 proofs/month limit
--          - Access to team features
-- ============================================================================

-- Function to determine user's effective type
CREATE OR REPLACE FUNCTION get_user_type(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscription_tier TEXT;
  v_is_team_member BOOLEAN;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO v_subscription_tier
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  LIMIT 1;

  -- If user has a paid subscription, return that tier
  IF v_subscription_tier IN ('professional', 'business', 'enterprise') THEN
    RETURN v_subscription_tier;
  END IF;

  -- Check if user is an active team member
  SELECT EXISTS(
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id
      AND status = 'active'
  ) INTO v_is_team_member;

  -- Return special team_member type if applicable
  IF v_is_team_member THEN
    RETURN 'team_member';
  ELSE
    RETURN 'free';
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_type(UUID) TO authenticated;

-- Function to get user limits based on type
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE(
  user_type TEXT,
  max_proofs_per_month INTEGER,
  max_storage_bytes BIGINT,
  proof_expiry_hours INTEGER,
  has_version_control BOOLEAN,
  has_tags BOOLEAN,
  can_create_teams BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  v_user_type := get_user_type(p_user_id);

  RETURN QUERY
  SELECT
    v_user_type,
    CASE v_user_type
      WHEN 'free' THEN 5
      WHEN 'team_member' THEN 25
      WHEN 'professional' THEN 25
      WHEN 'business' THEN 100
      WHEN 'enterprise' THEN 999999
    END AS max_proofs_per_month,
    CASE v_user_type
      WHEN 'free' THEN 10485760::BIGINT  -- 10MB
      WHEN 'team_member' THEN 104857600::BIGINT  -- 100MB
      WHEN 'professional' THEN 104857600::BIGINT  -- 100MB
      WHEN 'business' THEN 524288000::BIGINT  -- 500MB
      WHEN 'enterprise' THEN 2147483648::BIGINT  -- 2GB
    END AS max_storage_bytes,
    CASE v_user_type
      WHEN 'free' THEN 24
      WHEN 'team_member' THEN NULL  -- No expiry
      WHEN 'professional' THEN NULL
      WHEN 'business' THEN NULL
      WHEN 'enterprise' THEN NULL
    END AS proof_expiry_hours,
    CASE v_user_type
      WHEN 'free' THEN FALSE
      ELSE TRUE
    END AS has_version_control,
    CASE v_user_type
      WHEN 'free' THEN FALSE
      ELSE TRUE
    END AS has_tags,
    CASE v_user_type
      WHEN 'free' THEN FALSE
      WHEN 'team_member' THEN FALSE  -- Can't create teams, only join
      ELSE TRUE
    END AS can_create_teams;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_limits(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_user_type(UUID)
  IS 'Determines effective user type: free, team_member, professional, business, or enterprise';

COMMENT ON FUNCTION get_user_limits(UUID)
  IS 'Returns feature limits based on user type (team members get pro-tier proof features)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team member user type system created';
  RAISE NOTICE '✓ get_user_type() function - determines user tier';
  RAISE NOTICE '✓ get_user_limits() function - returns feature access';
  RAISE NOTICE '✓ Team members get:';
  RAISE NOTICE '  • No proof expiry (vs 24hrs for free)';
  RAISE NOTICE '  • 25 proofs/month (vs 5 for free)';
  RAISE NOTICE '  • 100MB storage (vs 10MB for free)';
  RAISE NOTICE '  • Version control & tags enabled';
  RAISE NOTICE '  • Cannot create teams (only join)';
END $$;
