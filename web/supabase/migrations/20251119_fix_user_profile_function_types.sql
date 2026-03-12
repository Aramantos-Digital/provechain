-- ============================================================================
-- Fix User Profile Function Type Mismatch
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix type mismatch between VARCHAR(255) and TEXT
--
-- Problem: auth.users.email is VARCHAR(255) but function returns TEXT
--
-- Solution: Explicitly cast VARCHAR to TEXT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,  -- Explicitly cast VARCHAR(255) to TEXT
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    )::TEXT as full_name,  -- Explicit cast
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar_url  -- Explicit cast
  FROM auth.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get basic user profile from auth.users (email, name, avatar) - Fixed type casting';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User profile function type casting fixed';
  RAISE NOTICE '✓ All VARCHAR fields explicitly cast to TEXT';
  RAISE NOTICE '✓ Function should now work without type mismatch errors';
END $$;
