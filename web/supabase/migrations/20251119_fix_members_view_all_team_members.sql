-- ============================================================================
-- Allow Team Members to View All Team Members
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Allow ALL team members (not just admins) to see other team members
--
-- Problem: Current policy only allows:
--   - Users to see their own membership
--   - Team admins to see all members of teams they admin
--   BUT regular members can't see other members!
--
-- Solution: Allow members to see all members of teams they belong to
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS team_members_select_admin_policy ON team_members;

-- Create new policy that allows members to see all members of their teams
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    -- Can see your own membership
    user_id = auth.uid()
    -- OR can see all members of teams you're a member of
    OR is_team_member(auth.uid(), team_id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_members_select_policy ON team_members
  IS 'Users can view their own memberships and all members of teams they belong to';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team members SELECT policy updated';
  RAISE NOTICE '✓ Team members can now see ALL members of their teams';
  RAISE NOTICE '✓ Both admins and regular members can view full team rosters';
  RAISE NOTICE '✓ Member counts will be accurate for everyone';
END $$;
