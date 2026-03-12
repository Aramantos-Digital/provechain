-- ============================================================================
-- Fix Team Invitations INSERT Policy
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix RLS policy violation on team_invitations INSERT
--
-- Problem: Current policy only checks invited_by = auth.uid()
--          but doesn't verify user is team admin
--
-- Solution: Use is_team_admin() SECURITY DEFINER function
-- ============================================================================

-- Drop the insufficient policy
DROP POLICY IF EXISTS team_invitations_insert_policy ON team_invitations;

-- Create new INSERT policy that verifies team admin status
CREATE POLICY team_invitations_insert_policy ON team_invitations
  FOR INSERT
  WITH CHECK (
    -- User must be setting themselves as the inviter
    invited_by = auth.uid()
    -- AND user must be admin of the team they're inviting to
    AND is_team_admin(auth.uid(), team_id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_invitations_insert_policy ON team_invitations
  IS 'Authenticated users can create invitations for teams they admin (uses is_team_admin function)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team invitations INSERT policy fixed';
  RAISE NOTICE '✓ Now verifies user is admin of the team';
  RAISE NOTICE '✓ Uses is_team_admin() SECURITY DEFINER function to avoid recursion';
END $$;
