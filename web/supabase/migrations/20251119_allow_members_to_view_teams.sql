-- ============================================================================
-- Allow Team Members to View Teams
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix "Team not found" error for invited members
--
-- Problem: teams_select_admin_policy only allows team OWNERS to view teams
--          Team MEMBERS can't view team data even though they're in team_members
--
-- Solution: Add policy to allow members to view teams they belong to
-- ============================================================================

-- Add policy for team members to view teams they're part of
CREATE POLICY teams_select_member_policy ON teams
  FOR SELECT
  USING (
    -- Can see teams where you're a member
    is_team_member(auth.uid(), id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY teams_select_member_policy ON teams
  IS 'Team members can view teams they belong to (uses is_team_member function)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team member view policy added';
  RAISE NOTICE '✓ Team members can now see teams they belong to';
  RAISE NOTICE '✓ Uses is_team_member() SECURITY DEFINER function';
  RAISE NOTICE '✓ Works for both admins and regular members';
END $$;
