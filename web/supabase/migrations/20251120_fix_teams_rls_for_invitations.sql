-- Migration: Fix Teams RLS to Allow Viewing During Invitation Acceptance
-- Created: 2025-11-20
-- Purpose: Allow users to see team details when they have a pending invitation
--          This fixes the "Unknown Team" issue on the accept invitation page

-- Drop the existing policy
DROP POLICY IF EXISTS teams_select_policy ON teams;

-- Recreate with invitation check added
CREATE POLICY teams_select_policy ON teams
  FOR SELECT
  USING (
    -- User is the admin
    admin_user_id = auth.uid()
    -- OR user is an active member
    OR id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    -- OR user has a pending invitation to this team
    OR id IN (
      SELECT ti.team_id
      FROM team_invitations ti
      INNER JOIN auth.users u ON u.email = ti.email
      WHERE u.id = auth.uid()
        AND ti.accepted_at IS NULL
        AND ti.expires_at > NOW()
    )
  );

COMMENT ON POLICY teams_select_policy ON teams IS 'Users can view teams they admin, are members of, or have pending invitations to';
