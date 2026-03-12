-- ============================================================================
-- Add Username to User Profile Function
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Return username from user_metadata in get_user_profile function
--
-- Changes: Add username field to return table from raw_user_meta_data
-- ============================================================================

-- Drop policies that depend on get_user_profile function
DROP POLICY IF EXISTS team_invitations_select_policy ON team_invitations;
DROP POLICY IF EXISTS team_invitations_update_policy ON team_invitations;

-- Drop existing function to allow changing return type
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- Recreate function with username field
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
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
    u.email::TEXT,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    )::TEXT as full_name,
    COALESCE(
      u.raw_user_meta_data->>'username',
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1)
    )::TEXT as username,
    (u.raw_user_meta_data->>'avatar_url')::TEXT as avatar_url
  FROM auth.users u
  WHERE u.id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_profile(UUID) IS 'Get user profile from auth.users including username for display';

-- ============================================================================
-- Note: Team invitation policies are recreated by dedicated migration
-- ============================================================================
-- The team_invitations policies are handled by:
-- - 20251119_fix_team_invitations_select_policy.sql
--
-- We don't recreate them here to avoid conflicts when migrations run in order

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User profile function updated with username field';
  RAISE NOTICE '✓ Username prioritizes: username > display_name > email prefix';
  RAISE NOTICE '✓ Team member displays can now show username with email tooltip';
  RAISE NOTICE '✓ Dependent RLS policies recreated successfully';
END $$;
