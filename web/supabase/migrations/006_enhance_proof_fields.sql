-- Enhance proofs table with better metadata fields
-- This migration adds more descriptive fields for proof management

-- Add new columns for enhanced proof metadata
alter table public.proofs
  add column if not exists proof_name text,
  add column if not exists description_title text,
  add column if not exists description_body text,
  add column if not exists official_document_date timestamptz;

-- Add indexes for search and filtering
create index if not exists idx_proofs_proof_name on public.proofs(proof_name);
create index if not exists idx_proofs_official_document_date on public.proofs(official_document_date);

-- Add comments explaining the new columns
comment on column public.proofs.proof_name is 'User-friendly name for the proof (e.g., "Johns Mortgage Contract")';
comment on column public.proofs.description_title is 'Short description title shown on proof cards';
comment on column public.proofs.description_body is 'Full description of the proof, shown in info modal';
comment on column public.proofs.official_document_date is 'The official date of the original document (e.g., when contract was signed)';

-- Note: file_name column remains for backwards compatibility
-- New proofs should use proof_name, but file_name will still work
comment on column public.proofs.file_name is 'Legacy field - use proof_name for new proofs. Contains folder/file name from upload.';

-- Migrate existing data: copy file_name to proof_name if proof_name is null
update public.proofs
set proof_name = file_name
where proof_name is null;

-- Migrate existing description to description_body
update public.proofs
set description_body = description
where description_body is null and description is not null;
