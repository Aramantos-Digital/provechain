-- ============================================================================
-- Fix Team Invitations SELECT Policy
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix SELECT policy so admins can see invitations they created
--
-- Problem: Current SELECT policy only shows invitations sent to YOUR email
--          But admins need to see invitations they sent to others
--          When API does .insert().select(), it fails because admin can't SELECT
--          the invitation they just created (which is for someone else's email)
--
-- Solution: Add policy to allow viewing invitations you created OR for teams you admin
-- ============================================================================

-- Drop the current limited policy
DROP POLICY IF EXISTS team_invitations_select_own_policy ON team_invitations;

-- Create comprehensive SELECT policy
CREATE POLICY team_invitations_select_policy ON team_invitations
  FOR SELECT
  USING (
    -- Can see invitations sent to your email
    email = (SELECT email FROM get_user_profile(auth.uid()))
    -- OR invitations you created (as the inviter)
    OR invited_by = auth.uid()
    -- OR invitations for teams you admin
    OR is_team_admin(auth.uid(), team_id)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY team_invitations_select_policy ON team_invitations
  IS 'Users can view: invitations to their email, invitations they sent, or invitations for teams they admin';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team invitations SELECT policy fixed';
  RAISE NOTICE '✓ Admins can now see invitations they created';
  RAISE NOTICE '✓ Admins can see all invitations for teams they manage';
  RAISE NOTICE '✓ Users can still see invitations sent to their email';
END $$;
