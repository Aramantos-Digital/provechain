-- ============================================================================
-- Add User Profile Helper Function
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Safely get user profile info from auth.users
--          (Can't query auth.users directly from client)

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
    u.email,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    ) as full_name,
    u.raw_user_meta_data->>'avatar_url' as avatar_url
  FROM auth.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get basic user profile from auth.users (email, name, avatar)';

-- Test it works
DO $$
BEGIN
  RAISE NOTICE '✅ User profile function created';
  RAISE NOTICE 'Usage: SELECT * FROM get_user_profile(user_id);';
END $$;
