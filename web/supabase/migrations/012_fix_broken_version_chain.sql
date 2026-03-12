-- Fix Broken Version Chain
-- Repairs the orphaned version chain by reconnecting it to the main chain

-- ============================================================================
-- PROBLEM: Version deletion created an orphaned chain
-- ============================================================================
-- Group 1 (root: 03071da0...) - v1 → v2 → v3 → v4 → v5 → v6 → v7 → weird v1
-- Group 2 (root: 3963afb7...) - v2 (orphaned!) → v3 → v4 → v5
--
-- The second chain's "v2" should point to v7 from the first chain

-- ============================================================================
-- STEP 1: Identify the chains
-- ============================================================================
-- First chain root: 03071da0-d57a-42f6-be56-b1818ba2ad91 (Nov 15, v1)
-- Second chain root: 3963afb7-965f-4585-a779-ded47b4a6252 (Nov 16, v2 with null parent)
-- Last of first chain: 5e9264f3-aac0-4a78-84d4-331d6d93c1e1 (Nov 16, v7)

-- ============================================================================
-- STEP 2: Fix the orphaned chain by connecting it to the main chain
-- ============================================================================
-- Connect the orphaned "v2" to point to v7 as its parent
update proofs
set parent_proof_id = '5e9264f3-aac0-4a78-84d4-331d6d93c1e1'
where id = '3963afb7-965f-4585-a779-ded47b4a6252'
  and parent_proof_id is null;

-- ============================================================================
-- STEP 3: Renumber all versions in chronological order
-- ============================================================================
-- Now that the chain is connected, renumber them 1-12 based on created_at

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
-- STEP 4: Update proof_tags to use the correct root_proof_id
-- ============================================================================
-- Since we've merged the chains, all tags should point to the true root

update proof_tags
set root_proof_id = '03071da0-d57a-42f6-be56-b1818ba2ad91'
where root_proof_id = '3963afb7-965f-4585-a779-ded47b4a6252';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after the migration to verify:
--
-- select
--   id,
--   version_number,
--   parent_proof_id,
--   created_at
-- from proofs
-- where file_name = '44 files'
-- order by version_number asc;
