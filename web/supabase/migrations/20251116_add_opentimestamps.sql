-- Migration: Add OpenTimestamps fields to proofs table
-- Created: 2025-11-16
-- Purpose: Add Bitcoin blockchain timestamping via OpenTimestamps

-- Add OTS proof field (stores base64-encoded .ots file)
ALTER TABLE proofs
ADD COLUMN IF NOT EXISTS ots_proof TEXT;

-- Add OTS status field (pending, confirmed, failed)
ALTER TABLE proofs
ADD COLUMN IF NOT EXISTS ots_status TEXT DEFAULT 'pending';

-- Add index for OTS status lookups
CREATE INDEX IF NOT EXISTS idx_proofs_ots_status ON proofs(ots_status);

-- Add comment
COMMENT ON COLUMN proofs.ots_proof IS 'Base64-encoded OpenTimestamps proof anchored to Bitcoin blockchain';
COMMENT ON COLUMN proofs.ots_status IS 'Status: pending (submitted to calendars), confirmed (on blockchain), failed';

-- Note: Run this migration in Supabase SQL Editor
-- After running, update all existing proofs to create OTS proofs via API
