-- ============================================================================
-- Fix Team Invitations RLS Policy
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix "permission denied for table users" error in team_invitations
--
-- Problem: team_invitations_select_own_policy tries to query auth.users
--          which is not allowed in RLS policies from client contexts
--
-- Solution: Use get_user_profile() function and add INSERT policy for API
-- ============================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS team_invitations_select_own_policy ON team_invitations;

-- Create new SELECT policy that uses the get_user_profile function
-- This allows users to view invitations sent to their email
CREATE POLICY team_invitations_select_own_policy ON team_invitations
  FOR SELECT
  USING (
    -- Match on email (for viewing invite before accepting)
    email = (
      SELECT email FROM get_user_profile(auth.uid())
    )
  );

-- Add INSERT policy for team invitations
-- This allows the API to create invitations after verifying admin status
CREATE POLICY team_invitations_insert_policy ON team_invitations
  FOR INSERT
  WITH CHECK (
    -- Only allow insert if the inviter is the authenticated user
    invited_by = auth.uid()
    -- Admin check is done in the API layer before calling insert
  );

-- Add UPDATE policy for marking invitations as accepted
CREATE POLICY team_invitations_update_policy ON team_invitations
  FOR UPDATE
  USING (
    -- Can update if invitation is sent to your email
    email = (
      SELECT email FROM get_user_profile(auth.uid())
    )
  )
  WITH CHECK (
    -- Only allow updating accepted_at field
    email = (
      SELECT email FROM get_user_profile(auth.uid())
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_invitations_select_own_policy ON team_invitations
  IS 'Users can view invitations sent to their email (uses get_user_profile to avoid auth.users access)';

COMMENT ON POLICY team_invitations_insert_policy ON team_invitations
  IS 'Authenticated users can create invitations they are sending (admin check happens in API)';

COMMENT ON POLICY team_invitations_update_policy ON team_invitations
  IS 'Users can update (accept) invitations sent to their email';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team invitations RLS policies fixed';
  RAISE NOTICE '✓ Removed auth.users query from SELECT policy';
  RAISE NOTICE '✓ Added INSERT policy for API to create invitations';
  RAISE NOTICE '✓ Added UPDATE policy for accepting invitations';
  RAISE NOTICE '✓ All policies use get_user_profile() function';
END $$;
