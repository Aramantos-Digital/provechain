-- ============================================================================
-- Fix Remaining Search Path Security Warnings
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix search_path for create_audit_log and can_create_proof functions

-- ============================================================================
-- FIX: create_audit_log with correct signature
-- ============================================================================
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
-- FIX: can_create_proof with correct signature
-- ============================================================================
DROP FUNCTION IF EXISTS can_create_proof(UUID, UUID);
CREATE OR REPLACE FUNCTION can_create_proof(p_user_id UUID, p_team_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stats RECORD;
  v_target_id UUID;
  v_target_column TEXT;
BEGIN
  -- Recalculate usage first
  IF p_team_id IS NOT NULL THEN
    PERFORM calculate_team_usage(p_team_id);
    v_target_id := p_team_id;
    v_target_column := 'team_id';
  ELSE
    PERFORM calculate_user_usage(p_user_id);
    v_target_id := p_user_id;
    v_target_column := 'user_id';
  END IF;

  -- Get usage stats
  IF p_team_id IS NOT NULL THEN
    SELECT * INTO v_stats FROM usage_stats WHERE team_id = p_team_id;
  ELSE
    SELECT * INTO v_stats FROM usage_stats WHERE user_id = p_user_id;
  END IF;

  -- Check proof count limit
  IF v_stats.max_proofs IS NOT NULL AND v_stats.proof_count >= v_stats.max_proofs THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'proof_limit_reached',
      'current', v_stats.proof_count,
      'limit', v_stats.max_proofs,
      'message', format('You have reached your proof limit of %s. Please upgrade your plan.', v_stats.max_proofs)
    );
  END IF;

  -- Check storage limit (estimate ~10KB per proof)
  IF v_stats.max_storage_bytes IS NOT NULL AND (v_stats.total_storage_bytes + 10240) > v_stats.max_storage_bytes THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'storage_limit_reached',
      'current', v_stats.total_storage_bytes,
      'limit', v_stats.max_storage_bytes,
      'message', format('You have reached your storage limit. Please upgrade your plan.')
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'current_proofs', v_stats.proof_count,
    'max_proofs', v_stats.max_proofs,
    'current_storage', v_stats.total_storage_bytes,
    'max_storage', v_stats.max_storage_bytes
  );
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Remaining search_path fixes applied successfully';
  RAISE NOTICE '✓ create_audit_log function updated with secure search_path';
  RAISE NOTICE '✓ can_create_proof function updated with secure search_path';
  RAISE NOTICE '';
  RAISE NOTICE '⚠ Note: Leaked password protection must be enabled in Supabase Dashboard';
  RAISE NOTICE '  Go to Authentication > Policies > Enable "Check for compromised passwords"';
END $$;
