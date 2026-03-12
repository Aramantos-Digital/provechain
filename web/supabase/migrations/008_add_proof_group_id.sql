-- Add proof_group_id for manual proof grouping/combining
-- This allows users to manually group proofs that should be versions of each other
-- even when they have different file_hash values

ALTER TABLE proofs
ADD COLUMN proof_group_id UUID;

-- Add index for faster queries when grouping by proof_group_id
CREATE INDEX idx_proofs_proof_group_id ON proofs(proof_group_id);

-- Add comment to explain the column
COMMENT ON COLUMN proofs.proof_group_id IS 'Optional UUID for manually grouping proofs together. When set, proofs with the same proof_group_id are displayed as versions of each other, regardless of file_hash differences.';
