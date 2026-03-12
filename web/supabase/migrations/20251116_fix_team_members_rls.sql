-- Fix infinite recursion in team_members RLS policy
-- The original policy referenced team_members within itself, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS team_members_select_policy ON team_members;

-- Create a simpler, non-recursive policy
-- Users can see team_members records where:
-- 1. They are the user_id in the record (their own membership)
-- 2. They are an admin of a team (can see all members of teams they admin)
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    -- Can see their own team memberships
    user_id = auth.uid()
    OR
    -- Can see members of teams they admin
    team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
  );

-- Also fix the manage policy to avoid similar issues
DROP POLICY IF EXISTS team_members_manage_policy ON team_members;

-- Simpler manage policy
CREATE POLICY team_members_manage_policy ON team_members
  FOR ALL
  USING (
    -- Only team admins can manage members
    team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
  );
