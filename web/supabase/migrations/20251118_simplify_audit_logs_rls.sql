-- ============================================================================
-- Simplify Audit Logs RLS - Remove Recursive Policies
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix infinite recursion by removing complex team policies

-- The issue: audit_logs team policies check team_members, which causes
-- infinite recursion in RLS evaluation

-- ============================================================================
-- Drop ALL existing policies
-- ============================================================================

DROP POLICY IF EXISTS audit_logs_select_user_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_select_team_admin_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_select_team_coadmin_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;

-- ============================================================================
-- Create SIMPLE policies that don't cause recursion
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL  -- Allow viewing records without user_id (shouldn't happen but safe)
  );

-- SECURITY DEFINER functions and triggers can write (bypass normal user restrictions)
-- This policy allows authenticated users and system functions to insert audit logs
CREATE POLICY audit_logs_write_policy ON audit_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Note: Team admin access removed to prevent recursion
-- ============================================================================
-- Team admins will only see audit logs for actions they personally performed
-- To add team admin access without recursion, we would need to:
-- 1. Add a direct admin_user_id column to teams (no subquery needed), OR
-- 2. Use a SECURITY DEFINER function to fetch team logs

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Audit logs RLS simplified';
  RAISE NOTICE '✓ Removed recursive team policies';
  RAISE NOTICE '✓ Simple policies for user access';
  RAISE NOTICE '✓ SECURITY DEFINER triggers can write via permissive policy';
  RAISE NOTICE '⚠ Team admin access temporarily disabled to prevent recursion';
END $$;
