-- Fix parent_proof_id relationships when deleting versions
-- The renumber trigger was working but didn't update parent relationships

-- ============================================================================
-- PART 1: Add function to fix parent relationships before deleting
-- ============================================================================
create or replace function fix_parent_before_delete()
returns trigger as $$
begin
  -- If the proof being deleted has children, update them to point to this proof's parent
  update public.proofs
  set parent_proof_id = old.parent_proof_id
  where parent_proof_id = old.id;

  return old;
end;
$$ language plpgsql security definer
set search_path = public;

-- Create the trigger to run BEFORE delete (so children can be updated)
drop trigger if exists fix_parent_trigger on public.proofs;
create trigger fix_parent_trigger
  before delete on public.proofs
  for each row
  execute function fix_parent_before_delete();

comment on function fix_parent_before_delete() is
  'Updates children to point to deleted proof''s parent before deletion. Security definer with explicit search_path.';

-- ============================================================================
-- PART 2: Fix the current broken chain
-- ============================================================================
-- Version 6 (cd4e9d74...) should point to version 4 (2ceed5a0...)
update proofs
set parent_proof_id = '2ceed5a0-d39f-4dea-8a36-06d23b201dc2'
where id = 'cd4e9d74-001b-4ee2-8dad-34677da3196e'
  and parent_proof_id is null;

-- ============================================================================
-- PART 3: Renumber all versions correctly
-- ============================================================================
do $$
declare
  proof_rec record;
  new_version integer := 1;
begin
  -- Renumber all proofs in chronological order
  for proof_rec in
    select id
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
-- PART 4: Fix any proof_tags to use the correct root
-- ============================================================================
update proof_tags
set root_proof_id = '03071da0-d57a-42f6-be56-b1818ba2ad91'
where root_proof_id = 'cd4e9d74-001b-4ee2-8dad-34677da3196e';
