-- Renumber existing versions that have duplicates
-- This is a one-time fix to clean up the current state

-- ============================================================================
-- Renumber all versions in the "44 files" chain
-- ============================================================================
do $$
declare
  proof_rec record;
  new_version integer := 1;
begin
  -- Get all proofs in this chain ordered by created_at
  for proof_rec in
    select id, created_at
    from proofs
    where file_name = '44 files'
    order by created_at asc
  loop
    update proofs
    set version_number = new_version
    where id = proof_rec.id;

    new_version := new_version + 1;
  end loop;
end $$;

-- ============================================================================
-- Verification: Check the renumbering worked
-- ============================================================================
-- After running, verify with:
--
-- select version_number, count(*)
-- from proofs
-- where file_name = '44 files'
-- group by version_number
-- order by version_number;
--
-- Should show each version number appears exactly once
