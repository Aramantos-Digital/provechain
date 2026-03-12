-- ============================================================================
-- Complete Fix for Audit Logs - Function + Triggers
-- ============================================================================
-- Created: 2025-11-18
-- Purpose: Fix both the function AND the trigger functions to use matching signatures

-- ============================================================================
-- Step 1: Drop all versions of create_audit_log
-- ============================================================================
DROP FUNCTION IF EXISTS create_audit_log(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS create_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB);

-- ============================================================================
-- Step 2: Create the CORRECT audit log function (6 parameters)
-- ============================================================================
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
-- Step 3: Fix log_proof_created trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION log_proof_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_audit_log(
    NEW.user_id,
    NEW.team_id,
    CASE WHEN NEW.parent_proof_id IS NOT NULL THEN 'version_created' ELSE 'proof_created' END,
    'proof',
    NEW.id,
    jsonb_build_object(
      'proof_name', NEW.proof_name,
      'file_hash', NEW.file_hash,
      'version_number', NEW.version_number
    )
  );
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Step 4: Fix log_proof_updated trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION log_proof_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only log if metadata changed (not internal fields)
  IF (OLD.proof_name IS DISTINCT FROM NEW.proof_name
    OR OLD.description_title IS DISTINCT FROM NEW.description_title
    OR OLD.description_body IS DISTINCT FROM NEW.description_body
    OR OLD.official_document_date IS DISTINCT FROM NEW.official_document_date
    OR OLD.version_notes IS DISTINCT FROM NEW.version_notes) THEN

    PERFORM create_audit_log(
      NEW.user_id,
      NEW.team_id,
      'proof_updated',
      'proof',
      NEW.id,
      jsonb_build_object(
        'proof_name', NEW.proof_name,
        'changes', jsonb_build_object(
          'name_changed', OLD.proof_name IS DISTINCT FROM NEW.proof_name,
          'description_changed', OLD.description_title IS DISTINCT FROM NEW.description_title OR OLD.description_body IS DISTINCT FROM NEW.description_body,
          'date_changed', OLD.official_document_date IS DISTINCT FROM NEW.official_document_date,
          'notes_changed', OLD.version_notes IS DISTINCT FROM NEW.version_notes
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Step 5: Fix log_proof_deleted trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION log_proof_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_audit_log(
    OLD.user_id,
    OLD.team_id,
    'proof_deleted',
    'proof',
    OLD.id,
    jsonb_build_object(
      'proof_name', OLD.proof_name,
      'file_hash', OLD.file_hash
    )
  );
  RETURN OLD;
END;
$$;

-- ============================================================================
-- Step 6: Recreate triggers (in case they were dropped)
-- ============================================================================
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
DO $$
BEGIN
  RAISE NOTICE '✅ Audit logs COMPLETELY FIXED';
  RAISE NOTICE '✓ create_audit_log function: 6 parameters with team_id';
  RAISE NOTICE '✓ log_proof_created: calls with 6 parameters';
  RAISE NOTICE '✓ log_proof_updated: calls with 6 parameters';
  RAISE NOTICE '✓ log_proof_deleted: calls with 6 parameters';
  RAISE NOTICE '✓ All triggers recreated';
  RAISE NOTICE '✓ Secure search_path on all functions';
END $$;
