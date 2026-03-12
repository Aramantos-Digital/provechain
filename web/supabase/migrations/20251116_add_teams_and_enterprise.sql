-- Migration: Add Teams and Enterprise Features
-- Created: 2025-11-16
-- Purpose: Support Professional, Business, and Enterprise tiers with team collaboration

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('professional', 'business', 'enterprise')),
  max_members INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_teams_admin_user_id ON teams(admin_user_id);

-- Add comments
COMMENT ON TABLE teams IS 'Enterprise teams for Professional, Business, and Enterprise tiers';
COMMENT ON COLUMN teams.tier IS 'professional (5 members), business (25 members), enterprise (unlimited)';
COMMENT ON COLUMN teams.max_members IS 'Maximum team members allowed based on tier';

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),

  -- Prevent duplicate team memberships
  UNIQUE(team_id, user_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Add comments
COMMENT ON TABLE team_members IS 'Members of enterprise teams';
COMMENT ON COLUMN team_members.role IS 'admin (can manage team), member (can only create proofs)';
COMMENT ON COLUMN team_members.status IS 'pending (invite sent), active (accepted), removed (kicked)';

-- ============================================================================
-- TEAM INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);

-- Add comments
COMMENT ON TABLE team_invitations IS 'Pending team invitations sent via email';
COMMENT ON COLUMN team_invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitations expire after 7 days';

-- ============================================================================
-- UPDATE PROOFS TABLE FOR TEAM ACCESS
-- ============================================================================
-- Add team_id column to proofs table (nullable for individual users)
ALTER TABLE proofs
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add index for team proof lookups
CREATE INDEX IF NOT EXISTS idx_proofs_team_id ON proofs(team_id);

-- Add comment
COMMENT ON COLUMN proofs.team_id IS 'If set, proof belongs to team and is accessible by all team members';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view teams they admin or are members of
CREATE POLICY teams_select_policy ON teams
  FOR SELECT
  USING (
    admin_user_id = auth.uid()
    OR id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Only admins can insert teams (via Stripe webhook)
CREATE POLICY teams_insert_policy ON teams
  FOR INSERT
  WITH CHECK (admin_user_id = auth.uid());

-- Policy: Only admins can update their teams
CREATE POLICY teams_update_policy ON teams
  FOR UPDATE
  USING (admin_user_id = auth.uid());

-- Policy: Only admins can delete their teams
CREATE POLICY teams_delete_policy ON teams
  FOR DELETE
  USING (admin_user_id = auth.uid());

-- Enable RLS on team_members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view other members in their team
CREATE POLICY team_members_select_policy ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
  );

-- Policy: Only team admins can manage members
CREATE POLICY team_members_manage_policy ON team_members
  FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
    OR (team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    ))
  );

-- Enable RLS on team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Only team admins can view/manage invitations
CREATE POLICY team_invitations_policy ON team_invitations
  FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
  );

-- Update proofs RLS policy to include team access
DROP POLICY IF EXISTS proofs_select_policy ON proofs;
CREATE POLICY proofs_select_policy ON proofs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to teams table
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - for testing)
-- ============================================================================
-- You can manually create test teams via the application
