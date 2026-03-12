-- ============================================================================
-- Add UPDATE and DELETE policies for team_members table
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Allow team admins to update member roles and remove members
--
-- Problem: team_members table only had SELECT and INSERT policies
--   - No way for admins to change member roles (promote/demote)
--   - No way for admins to remove members via RLS
--   - Updates were silently failing (returning error: null but 0 rows affected)
--
-- Solution: Add UPDATE and DELETE policies using existing is_team_admin() function
-- ============================================================================

-- =====================
-- TEAM MEMBERS TABLE
-- =====================

-- Policy: Team admins can update team_members records (change roles, etc.)
CREATE POLICY team_members_update_policy ON team_members
  FOR UPDATE
  USING (
    -- User must be an admin of this team
    is_team_admin(auth.uid(), team_id)
  )
  WITH CHECK (
    -- User must be an admin of this team
    is_team_admin(auth.uid(), team_id)
  );

-- Policy: Team admins can delete team_members records (remove members)
CREATE POLICY team_members_delete_policy ON team_members
  FOR DELETE
  USING (
    -- User must be an admin of this team
    is_team_admin(auth.uid(), team_id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_members_update_policy ON team_members IS 'Team admins can update member records (e.g., change roles)';
COMMENT ON POLICY team_members_delete_policy ON team_members IS 'Team admins can remove members from teams';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team members UPDATE and DELETE policies added';
  RAISE NOTICE '✓ Team admins can now change member roles';
  RAISE NOTICE '✓ Team admins can now remove members';
  RAISE NOTICE '✓ Using is_team_admin() function to avoid RLS recursion';
END $$;
