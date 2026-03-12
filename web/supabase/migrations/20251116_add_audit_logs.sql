-- Migration: Add Audit Logs (Changelog)
-- Created: 2025-11-16
-- Purpose: Track all user actions for compliance and enterprise features

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Add comments
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all user actions for compliance and changelog';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: proof_created, proof_deleted, tag_created, team_member_added, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type: proof, tag, team, team_member, subscription';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN audit_logs.details IS 'JSON object with action-specific data (proof_name, tag_name, etc.)';

-- ============================================================================
-- ACTION TYPES (Documentation)
-- ============================================================================
-- proof_created - User created a new proof
-- proof_deleted - User deleted a proof
-- proof_updated - User updated proof metadata (name, description, etc.)
-- version_created - User created a new version of a proof
-- tag_created - User created a new tag
-- tag_renamed - User renamed a tag
-- tag_deleted - User deleted a tag
-- proof_tagged - User added a tag to a proof
-- proof_untagged - User removed a tag from a proof
-- proofs_combined - User combined multiple proofs into one version history
-- team_created - Admin created a team
-- team_member_invited - Admin invited a team member
-- team_member_joined - User accepted team invitation
-- team_member_removed - Admin removed a team member
-- team_member_promoted - Admin promoted member to admin
-- subscription_created - User subscribed to paid tier
-- subscription_canceled - User canceled subscription
-- subscription_renewed - Subscription auto-renewed

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY audit_logs_select_user_policy ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Team admins can view all team member logs
CREATE POLICY audit_logs_select_team_admin_policy ON audit_logs
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE admin_user_id = auth.uid()
    )
  );

-- Policy: Team admins (including co-admins) can view team logs
CREATE POLICY audit_logs_select_team_coadmin_policy ON audit_logs
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Policy: System can insert (no user-facing inserts)
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true);  -- Will be inserted via API/functions

-- No update/delete policies - audit logs are immutable

-- ============================================================================
-- HELPER FUNCTION: Create Audit Log
-- ============================================================================
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_team_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATIC AUDIT LOG TRIGGERS
-- ============================================================================

-- Trigger: Log proof creation
CREATE OR REPLACE FUNCTION log_proof_created()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_proof_created ON proofs;
CREATE TRIGGER trigger_log_proof_created
  AFTER INSERT ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_created();

-- Trigger: Log proof deletion
CREATE OR REPLACE FUNCTION log_proof_deleted()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_proof_deleted ON proofs;
CREATE TRIGGER trigger_log_proof_deleted
  BEFORE DELETE ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_deleted();

-- Trigger: Log proof metadata updates
CREATE OR REPLACE FUNCTION log_proof_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if metadata changed (not internal fields)
  IF (OLD.proof_name != NEW.proof_name
    OR OLD.description_title != NEW.description_title
    OR OLD.description_body != NEW.description_body
    OR OLD.official_document_date != NEW.official_document_date
    OR OLD.version_notes != NEW.version_notes) THEN

    PERFORM create_audit_log(
      NEW.user_id,
      NEW.team_id,
      'proof_updated',
      'proof',
      NEW.id,
      jsonb_build_object(
        'proof_name', NEW.proof_name,
        'changes', jsonb_build_object(
          'name_changed', OLD.proof_name != NEW.proof_name,
          'description_changed', OLD.description_title != NEW.description_title OR OLD.description_body != NEW.description_body,
          'date_changed', OLD.official_document_date != NEW.official_document_date,
          'notes_changed', OLD.version_notes != NEW.version_notes
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_proof_updated ON proofs;
CREATE TRIGGER trigger_log_proof_updated
  AFTER UPDATE ON proofs
  FOR EACH ROW
  EXECUTE FUNCTION log_proof_updated();

-- ============================================================================
-- RETENTION POLICY (Optional)
-- ============================================================================
-- Keep audit logs for 1 year for individual users, 7 years for enterprise
-- This will be handled by a cron job in the future

-- Example function to clean old logs:
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND team_id IS NULL;  -- Only delete individual user logs, keep enterprise logs

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
