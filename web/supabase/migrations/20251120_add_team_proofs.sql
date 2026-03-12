-- ============================================================================
-- Add Team Proof Support
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Allow proofs to belong to teams for collaborative work
--
-- Features:
--   - Proofs can be personal or team-owned
--   - Team members can view/manage team proofs
--   - Dashboard filtering by personal vs team proofs
-- ============================================================================

-- Add team_id column to proofs
ALTER TABLE proofs
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add created_for context field
ALTER TABLE proofs
ADD COLUMN IF NOT EXISTS created_for TEXT CHECK (created_for IN ('personal', 'team')) DEFAULT 'personal';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_proofs_team_id ON proofs(team_id);
CREATE INDEX IF NOT EXISTS idx_proofs_created_for ON proofs(created_for);

-- Update RLS policy to allow team members to see team proofs
DROP POLICY IF EXISTS proofs_select_policy ON proofs;

CREATE POLICY proofs_select_policy ON proofs
  FOR SELECT
  USING (
    -- Personal proofs: user owns them
    user_id = auth.uid()
    -- OR Team proofs: user is a member of the team
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

-- Update INSERT policy to allow creating team proofs
DROP POLICY IF EXISTS proofs_insert_policy ON proofs;

CREATE POLICY proofs_insert_policy ON proofs
  FOR INSERT
  WITH CHECK (
    -- Can create personal proofs
    (user_id = auth.uid() AND team_id IS NULL)
    -- OR can create team proofs if member of that team
    OR (user_id = auth.uid() AND team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS proofs_update_policy ON proofs;

CREATE POLICY proofs_update_policy ON proofs
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  );

-- Update DELETE policy
DROP POLICY IF EXISTS proofs_delete_policy ON proofs;

CREATE POLICY proofs_delete_policy ON proofs
  FOR DELETE
  USING (
    -- Personal proofs: only owner can delete
    (team_id IS NULL AND user_id = auth.uid())
    -- Team proofs: only team admins can delete
    OR (team_id IS NOT NULL AND is_team_admin(auth.uid(), team_id))
  );

-- ============================================================================
-- Helper function to get user's teams for filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_team_options(p_user_id UUID)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  team_tier TEXT,
  user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as team_id,
    t.name as team_name,
    t.tier as team_tier,
    CASE
      WHEN t.admin_user_id = p_user_id THEN 'owner'
      ELSE tm.role
    END as user_role
  FROM teams t
  LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = p_user_id
  WHERE t.admin_user_id = p_user_id
     OR (tm.user_id = p_user_id AND tm.status = 'active')
  ORDER BY t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_team_options(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN proofs.team_id
  IS 'Team that owns this proof (NULL for personal proofs)';

COMMENT ON COLUMN proofs.created_for
  IS 'Context: personal or team proof';

COMMENT ON FUNCTION get_user_team_options(UUID)
  IS 'Returns list of teams user can create proofs for (used in dashboard filter)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team proof support added';
  RAISE NOTICE '✓ Proofs can now belong to teams';
  RAISE NOTICE '✓ Team members can view/manage team proofs';
  RAISE NOTICE '✓ RLS policies updated for team access';
  RAISE NOTICE '✓ Dashboard filtering ready (personal vs team)';
  RAISE NOTICE '✓ Only team admins can delete team proofs';
END $$;
