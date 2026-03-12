-- ============================================================================
-- Fix Audit Logs Column Name Mismatch
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix mismatch between audit_logs.details and resource_data parameter

-- The table has 'details' column, but the function uses 'resource_data' parameter
-- We need to update the function signature to match

DROP FUNCTION IF EXISTS create_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB);

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
  RAISE NOTICE 'Audit logs column mismatch fixed';
  RAISE NOTICE '✓ create_audit_log function now uses p_details parameter';
  RAISE NOTICE '✓ Maps correctly to audit_logs.details column';
END $$;
