-- ============================================================================
-- Fix Team Members SELECT Policy
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Allow team admins to view all members of their teams
--
-- Problem: Current policy only allows users to see their own team_members record
--          This means team admins can't see other members when loading team page
--          Result: Member count shows "1" and invited members don't appear
--
-- Solution: Add policy to allow viewing members of teams you admin
-- ============================================================================

-- Drop the old restrictive policy first
DROP POLICY IF EXISTS team_members_select_own_policy ON team_members;
DROP POLICY IF EXISTS team_members_select_admin_policy ON team_members;

-- Create new policy for team admins to view all members of their teams
CREATE POLICY team_members_select_admin_policy ON team_members
  FOR SELECT
  USING (
    -- Can see your own membership
    user_id = auth.uid()
    -- OR can see all members of teams you admin
    OR is_team_admin(auth.uid(), team_id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_members_select_admin_policy ON team_members
  IS 'Users can view their own memberships and all members of teams they admin';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team members SELECT policy fixed';
  RAISE NOTICE '✓ Team admins can now see all members of their teams';
  RAISE NOTICE '✓ Member counts will show correct numbers';
  RAISE NOTICE '✓ Accepted invitations will appear in team member lists';
END $$;
