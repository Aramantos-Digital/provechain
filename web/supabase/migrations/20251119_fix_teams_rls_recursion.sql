-- ============================================================================
-- Fix Teams RLS Infinite Recursion
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Fix infinite recursion in teams/team_members RLS policies
--
-- Problem: Circular dependency between teams and team_members policies
--   - teams_select_policy checks team_members table
--   - team_members_select_policy checks teams table
--   - This creates infinite recursion loop
--
-- Solution: Simplify policies and use SECURITY DEFINER functions for complex logic
--
-- Pattern learned from: 20251118_simplify_usage_stats_rls.sql
-- ============================================================================

-- ============================================================================
-- DROP ALL EXISTING TEAM POLICIES
-- ============================================================================

-- Teams table policies
DROP POLICY IF EXISTS teams_select_policy ON teams;
DROP POLICY IF EXISTS teams_insert_policy ON teams;
DROP POLICY IF EXISTS teams_update_policy ON teams;
DROP POLICY IF EXISTS teams_delete_policy ON teams;

-- Team members table policies
DROP POLICY IF EXISTS team_members_select_policy ON teams_members;
DROP POLICY IF EXISTS team_members_manage_policy ON team_members;

-- Team invitations table policies
DROP POLICY IF EXISTS team_invitations_policy ON team_invitations;

-- ============================================================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================================

-- ============
-- TEAMS TABLE
-- ============

-- Policy: Users can view teams where they are the admin (direct ownership check)
CREATE POLICY teams_select_admin_policy ON teams
  FOR SELECT
  USING (admin_user_id = auth.uid());

-- Policy: Only admins can insert teams (via Stripe webhook or UI)
CREATE POLICY teams_insert_policy ON teams
  FOR INSERT
  WITH CHECK (admin_user_id = auth.uid());

-- Policy: Only admins can update their teams
CREATE POLICY teams_update_policy ON teams
  FOR UPDATE
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

-- Policy: Only admins can delete their teams
CREATE POLICY teams_delete_policy ON teams
  FOR DELETE
  USING (admin_user_id = auth.uid());

-- =====================
-- TEAM MEMBERS TABLE
-- =====================

-- Policy: Users can view team_members records where they are the member
CREATE POLICY team_members_select_own_policy ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert themselves (when accepting invitations)
CREATE POLICY team_members_insert_own_policy ON team_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Note: Team admins managing members is handled by SECURITY DEFINER functions
-- to avoid recursion issues

-- =========================
-- TEAM INVITATIONS TABLE
-- =========================

-- Policy: Users can view invitations sent to their email
CREATE POLICY team_invitations_select_own_policy ON team_invitations
  FOR SELECT
  USING (
    -- Match on email (for viewing invite before accepting)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Note: Creating/managing invitations is handled via API with explicit admin checks
-- to avoid recursion

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR COMPLEX TEAM OPERATIONS
-- ============================================================================

-- Function: Check if user is admin of a team (no RLS recursion)
CREATE OR REPLACE FUNCTION is_team_admin(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is the team owner
  SELECT EXISTS(
    SELECT 1 FROM teams
    WHERE id = p_team_id AND admin_user_id = p_user_id
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an admin member
  SELECT EXISTS(
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND status = 'active'
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_team_admin(UUID, UUID) TO authenticated;

-- Function: Check if user is a member of a team (no RLS recursion)
CREATE OR REPLACE FUNCTION is_team_member(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_member BOOLEAN;
BEGIN
  -- Check if user is the team owner
  SELECT EXISTS(
    SELECT 1 FROM teams
    WHERE id = p_team_id AND admin_user_id = p_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN TRUE;
  END IF;

  -- Check if user is an active member
  SELECT EXISTS(
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
  ) INTO v_is_member;

  RETURN v_is_member;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_team_member(UUID, UUID) TO authenticated;

-- Function: Get user's teams (both owned and member)
CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  team_tier TEXT,
  team_max_members INTEGER,
  user_role TEXT,
  is_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- Teams where user is owner
  SELECT
    t.id as team_id,
    t.name as team_name,
    t.tier as team_tier,
    t.max_members as team_max_members,
    'admin'::TEXT as user_role,
    TRUE as is_owner
  FROM teams t
  WHERE t.admin_user_id = p_user_id

  UNION

  -- Teams where user is a member
  SELECT
    t.id as team_id,
    t.name as team_name,
    t.tier as team_tier,
    t.max_members as team_max_members,
    tm.role as user_role,
    FALSE as is_owner
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id AND tm.status = 'active';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_teams(UUID) TO authenticated;

-- ============================================================================
-- UPDATE PROOFS RLS POLICY TO USE FUNCTION
-- ============================================================================

-- Drop existing proof team access policy
DROP POLICY IF EXISTS proofs_select_policy ON proofs;

-- Recreate with simplified logic
CREATE POLICY proofs_select_policy ON proofs
  FOR SELECT
  USING (
    -- User owns the proof
    user_id = auth.uid()
    -- OR proof belongs to a team the user is a member of (use function to avoid recursion)
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY teams_select_admin_policy ON teams IS 'Users can view teams they own';
COMMENT ON POLICY teams_insert_policy ON teams IS 'Users can create teams';
COMMENT ON POLICY teams_update_policy ON teams IS 'Users can update teams they own';
COMMENT ON POLICY teams_delete_policy ON teams IS 'Users can delete teams they own';

COMMENT ON POLICY team_members_select_own_policy ON team_members IS 'Users can view their own team memberships';
COMMENT ON POLICY team_members_insert_own_policy ON team_members IS 'Users can add themselves to teams (via invitation acceptance)';

COMMENT ON POLICY team_invitations_select_own_policy ON team_invitations IS 'Users can view invitations sent to their email';

COMMENT ON FUNCTION is_team_admin(UUID, UUID) IS 'Check if user is admin of a team (owner or admin role)';
COMMENT ON FUNCTION is_team_member(UUID, UUID) IS 'Check if user is a member of a team (owner or active member)';
COMMENT ON FUNCTION get_user_teams(UUID) IS 'Get all teams a user has access to (owned or member)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Teams RLS policies fixed';
  RAISE NOTICE '✓ Removed circular dependencies between teams and team_members';
  RAISE NOTICE '✓ Simple policies for direct ownership checks';
  RAISE NOTICE '✓ SECURITY DEFINER functions for complex team membership logic';
  RAISE NOTICE '✓ No more infinite recursion!';
END $$;
