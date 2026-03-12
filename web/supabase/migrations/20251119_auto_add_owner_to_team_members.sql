-- ============================================================================
-- Auto-Add Team Owner to Team Members
-- ============================================================================
-- Created: 2025-11-19
-- Purpose: Automatically add team owner to team_members when team is created
--
-- Problem: Team owner (admin_user_id) is not in team_members table
--          This causes member count to be wrong (shows 0 instead of 1)
--
-- Solution: Create trigger to auto-add owner when team is created
-- ============================================================================

-- Function to add team owner to team_members
CREATE OR REPLACE FUNCTION add_owner_to_team_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert the team owner into team_members
  INSERT INTO team_members (
    team_id,
    user_id,
    role,
    invited_by,
    invited_at,
    joined_at,
    status
  ) VALUES (
    NEW.id,
    NEW.admin_user_id,
    'admin',
    NEW.admin_user_id,  -- Self-invited
    NOW(),
    NOW(),
    'active'
  )
  ON CONFLICT (team_id, user_id) DO NOTHING;  -- Don't duplicate if already exists

  RETURN NEW;
END;
$$;

-- Create trigger on teams table
DROP TRIGGER IF EXISTS add_owner_to_members_trigger ON teams;
CREATE TRIGGER add_owner_to_members_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_team_members();

-- ============================================================================
-- Backfill existing teams (add current owners to team_members)
-- ============================================================================

INSERT INTO team_members (
  team_id,
  user_id,
  role,
  invited_by,
  invited_at,
  joined_at,
  status
)
SELECT
  t.id as team_id,
  t.admin_user_id as user_id,
  'admin' as role,
  t.admin_user_id as invited_by,
  t.created_at as invited_at,
  t.created_at as joined_at,
  'active' as status
FROM teams t
WHERE NOT EXISTS (
  -- Only add if not already in team_members
  SELECT 1 FROM team_members tm
  WHERE tm.team_id = t.id AND tm.user_id = t.admin_user_id
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION add_owner_to_team_members()
  IS 'Automatically adds team owner to team_members when team is created';

COMMENT ON TRIGGER add_owner_to_members_trigger ON teams
  IS 'Trigger to auto-add team owner to team_members table';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backfilled_count
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.admin_user_id = tm.user_id AND tm.role = 'admin';

  RAISE NOTICE '✅ Team owner auto-add trigger created';
  RAISE NOTICE '✓ Existing team owners backfilled: %', v_backfilled_count;
  RAISE NOTICE '✓ New teams will automatically add owner to team_members';
  RAISE NOTICE '✓ Member counts will now include the owner';
END $$;
