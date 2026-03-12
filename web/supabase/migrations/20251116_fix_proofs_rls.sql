-- Fix proofs RLS policy - remove team access for now
-- The team-based SELECT policy on proofs was causing infinite recursion
-- We'll add team access back later when team features are actually built

-- Drop the problematic policy
DROP POLICY IF EXISTS proofs_select_policy ON proofs;

-- Create simple policy WITHOUT team access (for now)
-- Users can only see their own proofs
CREATE POLICY proofs_select_policy ON proofs
  FOR SELECT
  USING (user_id = auth.uid());

-- Note: When we build team features, we'll update this policy properly
-- For now, keep it simple to avoid recursion
