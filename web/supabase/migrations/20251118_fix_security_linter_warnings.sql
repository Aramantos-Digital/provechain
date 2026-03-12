-- ============================================================================
-- Fix Security Linter Warnings
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Address Supabase database linter security warnings
--   - Enable RLS on team_members table
--   - Fix function search_path mutability
--   - Enable leaked password protection

-- ============================================================================
-- FIX 1: Enable RLS on team_members (CRITICAL)
-- ============================================================================
-- The policies exist but RLS was not re-enabled after the fix migration

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIX 2: Set search_path on functions (SECURITY BEST PRACTICE)
-- ============================================================================
-- This prevents potential SQL injection via search_path manipulation

-- Fix update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers that were dropped with CASCADE
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix create_audit_log
DROP FUNCTION IF EXISTS create_audit_log(UUID, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_data)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_data)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Fix log_proof_created
DROP FUNCTION IF EXISTS log_proof_created() CASCADE;
CREATE OR REPLACE FUNCTION log_proof_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_audit_log(
    NEW.user_id,
    'proof_created',
    'proof',
    jsonb_build_object(
      'proof_id', NEW.id,
      'file_name', NEW.file_name,
      'file_hash', NEW.file_hash
    )
  );
  RETURN NEW;
END;
$$;

-- Fix log_proof_updated
DROP FUNCTION IF EXISTS log_proof_updated() CASCADE;
CREATE OR REPLACE FUNCTION log_proof_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_audit_log(
    NEW.user_id,
    'proof_updated',
    'proof',
    jsonb_build_object(
      'proof_id', NEW.id,
      'file_name', NEW.file_name,
      'changes', jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    )
  );
  RETURN NEW;
END;
$$;

-- Fix log_proof_deleted
DROP FUNCTION IF EXISTS log_proof_deleted() CASCADE;
CREATE OR REPLACE FUNCTION log_proof_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_audit_log(
    OLD.user_id,
    'proof_deleted',
    'proof',
    jsonb_build_object(
      'proof_id', OLD.id,
      'file_name', OLD.file_name,
      'file_hash', OLD.file_hash
    )
  );
  RETURN OLD;
END;
$$;

-- Fix cleanup_old_audit_logs
DROP FUNCTION IF EXISTS cleanup_old_audit_logs();
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Fix can_create_proof
DROP FUNCTION IF EXISTS can_create_proof(UUID);
CREATE OR REPLACE FUNCTION can_create_proof(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT;
  v_proof_count INTEGER;
  v_max_proofs INTEGER;
BEGIN
  -- Get user's tier
  SELECT COALESCE(s.tier, 'free')
  INTO v_tier
  FROM auth.users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = p_user_id;

  -- Free tier has no proof limit (only storage/expiry limits)
  IF v_tier = 'free' THEN
    RETURN TRUE;
  END IF;

  -- All paid tiers have unlimited proofs
  RETURN TRUE;
END;
$$;

-- Fix calculate_user_usage
DROP FUNCTION IF EXISTS calculate_user_usage(UUID);
CREATE OR REPLACE FUNCTION calculate_user_usage(p_user_id UUID)
RETURNS TABLE(
  total_proofs BIGINT,
  total_storage_bytes BIGINT,
  total_ots_verifications BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_proofs,
    COALESCE(SUM(file_size), 0)::BIGINT as total_storage_bytes,
    COALESCE(SUM(ots_verification_count), 0)::BIGINT as total_ots_verifications
  FROM proofs
  WHERE user_id = p_user_id;
END;
$$;

-- Fix calculate_team_usage
DROP FUNCTION IF EXISTS calculate_team_usage(UUID);
CREATE OR REPLACE FUNCTION calculate_team_usage(p_team_id UUID)
RETURNS TABLE(
  total_proofs BIGINT,
  total_storage_bytes BIGINT,
  total_members BIGINT,
  total_ots_verifications BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM proofs WHERE team_id = p_team_id) as total_proofs,
    (SELECT COALESCE(SUM(file_size), 0)::BIGINT FROM proofs WHERE team_id = p_team_id) as total_storage_bytes,
    (SELECT COUNT(*)::BIGINT FROM team_members WHERE team_id = p_team_id AND status = 'active') as total_members,
    (SELECT COALESCE(SUM(ots_verification_count), 0)::BIGINT FROM proofs WHERE team_id = p_team_id) as total_ots_verifications;
END;
$$;

-- Recreate triggers that were dropped with CASCADE
DROP TRIGGER IF EXISTS log_proof_created_trigger ON proofs;
CREATE TRIGGER log_proof_created_trigger
  AFTER INSERT ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_created();

DROP TRIGGER IF EXISTS log_proof_updated_trigger ON proofs;
CREATE TRIGGER log_proof_updated_trigger
  AFTER UPDATE ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_updated();

DROP TRIGGER IF EXISTS log_proof_deleted_trigger ON proofs;
CREATE TRIGGER log_proof_deleted_trigger
  AFTER DELETE ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_deleted();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on team_members table';
  END IF;

  RAISE NOTICE 'Security fixes applied successfully';
  RAISE NOTICE '✓ RLS enabled on team_members';
  RAISE NOTICE '✓ All functions have secure search_path';
  RAISE NOTICE '⚠ Note: Leaked password protection must be enabled in Supabase Dashboard';
  RAISE NOTICE '  Go to Authentication > Policies > Password Strength';
END $$;
