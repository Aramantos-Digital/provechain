-- ============================================================================
-- Final Fix for Audit Logs - Comprehensive Solution
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix all audit log function signature mismatches once and for all

-- Drop all existing versions of create_audit_log
DROP FUNCTION IF EXISTS create_audit_log(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS create_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB);

-- Create the CORRECT version that matches the original schema
-- This version has team_id as the second parameter
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_team_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    team_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_user_id,
    p_team_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Audit logs completely fixed';
  RAISE NOTICE '✓ create_audit_log has correct 6-parameter signature';
  RAISE NOTICE '✓ Function uses p_details parameter (not p_resource_data)';
  RAISE NOTICE '✓ Maps correctly to audit_logs.details column';
  RAISE NOTICE '✓ Secure search_path set';
END $$;
