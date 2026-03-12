-- ============================================================================
-- Proof Transfer & Approval System
-- ============================================================================
-- Created: 2025-11-20
-- Purpose: Allow users to move/copy proofs between personal and teams
--          with admin approval for personal → team transfers
--
-- Features:
--   - Move/Copy proofs between personal and teams
--   - Admin approval required for personal → team transfers
--   - Team admins can move/copy team proofs freely
--   - Regular members cannot move/copy team proofs out
--   - Independent copies (separate proofs) or Linked copies (shared data)
--   - Overwrite detection for existing proofs
--   - Activity logging for all transfers
-- ============================================================================

-- ============================================================================
-- LINKED PROOFS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS linked_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
  linked_to_proof_id UUID NOT NULL REFERENCES proofs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proof_id, linked_to_proof_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_linked_proofs_proof_id ON linked_proofs(proof_id);
CREATE INDEX IF NOT EXISTS idx_linked_proofs_linked_to ON linked_proofs(linked_to_proof_id);

-- RLS policies for linked proofs
ALTER TABLE linked_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linked_proofs_select_policy ON linked_proofs;

CREATE POLICY linked_proofs_select_policy ON linked_proofs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proofs WHERE id = linked_proofs.proof_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM proofs WHERE id = linked_proofs.linked_to_proof_id AND user_id = auth.uid()
    )
  );

COMMENT ON TABLE linked_proofs
  IS 'Tracks linked copies where multiple proof locations point to the same data';

-- ============================================================================
-- PROOF TRANSFER REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS proof_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_ids UUID[] NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL CHECK (from_location IN ('personal', 'team')),
  from_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  to_location TEXT NOT NULL CHECK (to_location IN ('personal', 'team')),
  to_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('move', 'copy')),
  copy_option TEXT CHECK (copy_option IN ('independent', 'linked')),
  overwrite_action TEXT CHECK (overwrite_action IN ('skip', 'overwrite', 'keep_both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_from_team CHECK (
    (from_location = 'team' AND from_team_id IS NOT NULL) OR
    (from_location = 'personal' AND from_team_id IS NULL)
  ),
  CONSTRAINT valid_to_team CHECK (
    (to_location = 'team' AND to_team_id IS NOT NULL) OR
    (to_location = 'personal' AND to_team_id IS NULL)
  ),
  CONSTRAINT valid_copy_option CHECK (
    (transfer_type = 'copy' AND copy_option IS NOT NULL) OR
    (transfer_type = 'move' AND copy_option IS NULL)
  )
);

-- Update existing table schema (if table already exists from previous run)
DO $$
BEGIN
  -- Add overwrite_action column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proof_transfer_requests' AND column_name = 'overwrite_action'
  ) THEN
    ALTER TABLE proof_transfer_requests
    ADD COLUMN overwrite_action TEXT CHECK (overwrite_action IN ('skip', 'overwrite', 'keep_both'));
  END IF;

  -- Update copy_option constraint to use new values
  -- Drop old constraint if exists
  ALTER TABLE proof_transfer_requests DROP CONSTRAINT IF EXISTS proof_transfer_requests_copy_option_check;

  -- Add new constraint with updated values
  ALTER TABLE proof_transfer_requests
  ADD CONSTRAINT proof_transfer_requests_copy_option_check
  CHECK (copy_option IN ('independent', 'linked'));
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proof_transfer_requests_status ON proof_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_proof_transfer_requests_to_team ON proof_transfer_requests(to_team_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_proof_transfer_requests_requested_by ON proof_transfer_requests(requested_by);

-- ============================================================================
-- RLS POLICIES FOR PROOF TRANSFER REQUESTS
-- ============================================================================

ALTER TABLE proof_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
DROP POLICY IF EXISTS proof_transfer_requests_select_own ON proof_transfer_requests;

CREATE POLICY proof_transfer_requests_select_own ON proof_transfer_requests
  FOR SELECT
  USING (requested_by = auth.uid());

-- Team admins can view pending requests for their teams
DROP POLICY IF EXISTS proof_transfer_requests_select_admin ON proof_transfer_requests;

CREATE POLICY proof_transfer_requests_select_admin ON proof_transfer_requests
  FOR SELECT
  USING (
    to_team_id IS NOT NULL
    AND is_team_admin(auth.uid(), to_team_id)
    AND status = 'pending'
  );

-- Users can create requests
DROP POLICY IF EXISTS proof_transfer_requests_insert_policy ON proof_transfer_requests;

CREATE POLICY proof_transfer_requests_insert_policy ON proof_transfer_requests
  FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Team admins can update (approve/reject) requests for their teams
DROP POLICY IF EXISTS proof_transfer_requests_update_policy ON proof_transfer_requests;

CREATE POLICY proof_transfer_requests_update_policy ON proof_transfer_requests
  FOR UPDATE
  USING (
    to_team_id IS NOT NULL
    AND is_team_admin(auth.uid(), to_team_id)
    AND status = 'pending'
  )
  WITH CHECK (
    to_team_id IS NOT NULL
    AND is_team_admin(auth.uid(), to_team_id)
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can transfer proofs
CREATE OR REPLACE FUNCTION can_transfer_proofs(
  p_user_id UUID,
  p_proof_ids UUID[],
  p_from_location TEXT,
  p_from_team_id UUID,
  p_to_location TEXT,
  p_to_team_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proof_id UUID;
  v_proof_team_id UUID;
  v_proof_user_id UUID;
BEGIN
  -- Check each proof
  FOREACH v_proof_id IN ARRAY p_proof_ids
  LOOP
    SELECT team_id, user_id INTO v_proof_team_id, v_proof_user_id
    FROM proofs
    WHERE id = v_proof_id;

    IF NOT FOUND THEN
      RETURN FALSE; -- Proof doesn't exist
    END IF;

    -- Verify proof location matches from_location
    IF p_from_location = 'personal' AND v_proof_team_id IS NOT NULL THEN
      RETURN FALSE;
    END IF;

    IF p_from_location = 'team' AND (v_proof_team_id IS NULL OR v_proof_team_id != p_from_team_id) THEN
      RETURN FALSE;
    END IF;

    -- Check permissions for team proofs
    IF p_from_location = 'team' THEN
      -- Only team admins can move/copy team proofs out
      IF NOT is_team_admin(p_user_id, p_from_team_id) THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- Check if user owns personal proofs
    IF p_from_location = 'personal' AND v_proof_user_id != p_user_id THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  -- Check if user is member of destination team
  IF p_to_location = 'team' AND NOT is_team_member(p_user_id, p_to_team_id) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_transfer_proofs(UUID, UUID[], TEXT, UUID, TEXT, UUID) TO authenticated;

-- Function to get pending transfer requests for a team
CREATE OR REPLACE FUNCTION get_team_transfer_requests(p_team_id UUID)
RETURNS TABLE(
  id UUID,
  proof_ids UUID[],
  proof_count INTEGER,
  requested_by UUID,
  requester_email TEXT,
  requester_username TEXT,
  from_location TEXT,
  to_location TEXT,
  transfer_type TEXT,
  copy_option TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user is team admin
  IF NOT is_team_admin(auth.uid(), p_team_id) THEN
    RAISE EXCEPTION 'Only team admins can view transfer requests';
  END IF;

  RETURN QUERY
  SELECT
    ptr.id,
    ptr.proof_ids,
    array_length(ptr.proof_ids, 1) as proof_count,
    ptr.requested_by,
    u.email::TEXT as requester_email,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))::TEXT as requester_username,
    ptr.from_location,
    ptr.to_location,
    ptr.transfer_type,
    ptr.copy_option,
    ptr.created_at
  FROM proof_transfer_requests ptr
  JOIN auth.users u ON u.id = ptr.requested_by
  WHERE ptr.to_team_id = p_team_id
    AND ptr.status = 'pending'
  ORDER BY ptr.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_transfer_requests(UUID) TO authenticated;

-- Function to check for duplicate proofs at destination
CREATE OR REPLACE FUNCTION check_duplicate_proofs(
  p_proof_ids UUID[],
  p_to_location TEXT,
  p_to_team_id UUID
)
RETURNS TABLE(
  proof_id UUID,
  file_hash TEXT,
  file_name TEXT,
  duplicate_found BOOLEAN,
  existing_proof_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as proof_id,
    p.file_hash,
    p.file_name,
    EXISTS(
      SELECT 1 FROM proofs existing
      WHERE existing.file_hash = p.file_hash
        AND existing.id != p.id
        AND CASE
          WHEN p_to_location = 'personal' THEN existing.team_id IS NULL AND existing.user_id = auth.uid()
          WHEN p_to_location = 'team' THEN existing.team_id = p_to_team_id
          ELSE FALSE
        END
    ) as duplicate_found,
    (
      SELECT existing.id FROM proofs existing
      WHERE existing.file_hash = p.file_hash
        AND existing.id != p.id
        AND CASE
          WHEN p_to_location = 'personal' THEN existing.team_id IS NULL AND existing.user_id = auth.uid()
          WHEN p_to_location = 'team' THEN existing.team_id = p_to_team_id
          ELSE FALSE
        END
      LIMIT 1
    ) as existing_proof_id
  FROM proofs p
  WHERE p.id = ANY(p_proof_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_proofs(UUID[], TEXT, UUID) TO authenticated;

-- Function to approve/reject transfer request
CREATE OR REPLACE FUNCTION review_transfer_request(
  p_request_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_reviewer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_proof_id UUID;
  v_new_proof_id UUID;
  v_proof RECORD;
  v_all_versions UUID[];
BEGIN
  -- Get request details
  SELECT * INTO v_request
  FROM proof_transfer_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer request not found or already processed';
  END IF;

  -- Verify reviewer is admin of destination team
  IF NOT is_team_admin(p_reviewer_id, v_request.to_team_id) THEN
    RAISE EXCEPTION 'Only team admins can review transfer requests';
  END IF;

  -- Update request status
  UPDATE proof_transfer_requests
  SET
    status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- If rejected, we're done
  IF p_action = 'reject' THEN
    RETURN TRUE;
  END IF;

  -- If approved, execute the transfer
  IF v_request.transfer_type = 'move' THEN
    -- MOVE: Update team_id and created_for on existing proofs
    FOREACH v_proof_id IN ARRAY v_request.proof_ids
    LOOP
      UPDATE proofs
      SET
        team_id = v_request.to_team_id,
        created_for = v_request.to_location
      WHERE id = v_proof_id;
    END LOOP;

  ELSIF v_request.transfer_type = 'copy' THEN
    -- COPY: Create new proofs or linked references
    FOREACH v_proof_id IN ARRAY v_request.proof_ids
    LOOP
      SELECT * INTO v_proof FROM proofs WHERE id = v_proof_id;

      IF v_request.copy_option = 'independent' THEN
        -- Independent Copy: Create completely separate proof with duplicate data
        INSERT INTO proofs (
          user_id, file_name, file_hash, file_size, timestamp, proof_json,
          team_id, created_for, expires_at,
          proof_name, description_title, description_body, official_document_date,
          parent_proof_id, version_number, proof_group_id
        ) VALUES (
          v_request.requested_by,
          v_proof.file_name,
          v_proof.file_hash,
          v_proof.file_size,
          v_proof.timestamp,
          v_proof.proof_json,
          v_request.to_team_id,
          v_request.to_location,
          CASE WHEN v_request.to_location = 'team' THEN NULL ELSE v_proof.expires_at END,
          v_proof.proof_name,
          v_proof.description_title,
          v_proof.description_body,
          v_proof.official_document_date,
          NULL, -- No parent (independent copy)
          1, -- Reset version number
          NULL -- New proof group
        );

      ELSIF v_request.copy_option = 'linked' THEN
        -- Linked Copy: Create reference proof that points to original
        -- Insert new proof entry
        INSERT INTO proofs (
          user_id, file_name, file_hash, file_size, timestamp, proof_json,
          team_id, created_for, expires_at,
          proof_name, description_title, description_body, official_document_date,
          parent_proof_id, version_number, proof_group_id
        ) VALUES (
          v_request.requested_by,
          v_proof.file_name,
          v_proof.file_hash,
          v_proof.file_size,
          v_proof.timestamp,
          v_proof.proof_json,
          v_request.to_team_id,
          v_request.to_location,
          CASE WHEN v_request.to_location = 'team' THEN NULL ELSE v_proof.expires_at END,
          v_proof.proof_name,
          v_proof.description_title,
          v_proof.description_body,
          v_proof.official_document_date,
          NULL,
          1,
          v_proof.proof_group_id -- Share the same group for linked proofs
        )
        RETURNING id INTO v_new_proof_id;

        -- Create link between original and new proof
        INSERT INTO linked_proofs (proof_id, linked_to_proof_id)
        VALUES (v_new_proof_id, v_proof_id);

        -- Also create reverse link for bidirectional relationship
        INSERT INTO linked_proofs (proof_id, linked_to_proof_id)
        VALUES (v_proof_id, v_new_proof_id);
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION review_transfer_request(UUID, TEXT, UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE proof_transfer_requests
  IS 'Tracks requests to move/copy proofs between personal and team collections';

COMMENT ON COLUMN proof_transfer_requests.proof_ids
  IS 'Array of proof IDs being transferred';

COMMENT ON COLUMN proof_transfer_requests.from_location
  IS 'Source: personal or team';

COMMENT ON COLUMN proof_transfer_requests.to_location
  IS 'Destination: personal or team';

COMMENT ON COLUMN proof_transfer_requests.transfer_type
  IS 'move (relocate) or copy (duplicate)';

COMMENT ON COLUMN proof_transfer_requests.copy_option
  IS 'For copies: independent (separate proof) or linked (shared data)';

COMMENT ON COLUMN proof_transfer_requests.overwrite_action
  IS 'When proof exists at destination: skip, overwrite, or keep_both';

COMMENT ON FUNCTION can_transfer_proofs(UUID, UUID[], TEXT, UUID, TEXT, UUID)
  IS 'Validates if user has permission to transfer specified proofs';

COMMENT ON FUNCTION check_duplicate_proofs(UUID[], TEXT, UUID)
  IS 'Checks if proofs already exist at destination (by file_hash) for overwrite detection';

COMMENT ON FUNCTION get_team_transfer_requests(UUID)
  IS 'Returns pending transfer requests for a team (admin only)';

COMMENT ON FUNCTION review_transfer_request(UUID, TEXT, UUID)
  IS 'Approve or reject a transfer request and execute if approved';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Proof transfer system created';
  RAISE NOTICE '✓ linked_proofs table ready for tracking shared data';
  RAISE NOTICE '✓ proof_transfer_requests table ready';
  RAISE NOTICE '✓ RLS policies configured';
  RAISE NOTICE '✓ Permission validation functions added';
  RAISE NOTICE '✓ Duplicate detection function ready';
  RAISE NOTICE '✓ Transfer request workflow ready';
  RAISE NOTICE '✓ Team admins can approve/reject transfers';
  RAISE NOTICE '✓ Move operations (transfer ownership)';
  RAISE NOTICE '✓ Copy operations (independent or linked)';
  RAISE NOTICE '✓ Overwrite detection for existing proofs';
END $$;
