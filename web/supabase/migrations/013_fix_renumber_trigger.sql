-- Fix the renumber_versions_after_delete trigger
-- Problem: It was using proof_name to group versions, but not all proofs have proof_name
-- Solution: Use parent_proof_id chain to find the root, then renumber all versions in that chain

-- ============================================================================
-- Drop the old broken trigger
-- ============================================================================
drop trigger if exists renumber_versions_trigger on public.proofs;

-- ============================================================================
-- Create improved renumber function that works with version chains
-- ============================================================================
create or replace function renumber_versions_after_delete()
returns trigger as $$
declare
  version_rec record;
  new_version_num integer;
  v_root_id uuid;
begin
  -- Find the root proof ID for the deleted proof's chain
  -- We use a recursive CTE to traverse up the parent chain
  with recursive version_chain as (
    -- Start with the deleted proof
    select id, parent_proof_id from public.proofs where id = old.id
    union all
    -- Recursively get parents
    select p.id, p.parent_proof_id
    from public.proofs p
    join version_chain vc on p.id = vc.parent_proof_id
  )
  select id into v_root_id
  from version_chain
  where parent_proof_id is null;

  -- If we couldn't find a root (shouldn't happen), try using the deleted proof's parent
  if v_root_id is null then
    -- Check if deleted proof had a parent
    if old.parent_proof_id is not null then
      -- Traverse up from the parent
      with recursive version_chain as (
        select id, parent_proof_id from public.proofs where id = old.parent_proof_id
        union all
        select p.id, p.parent_proof_id
        from public.proofs p
        join version_chain vc on p.id = vc.parent_proof_id
      )
      select id into v_root_id
      from version_chain
      where parent_proof_id is null;
    else
      -- The deleted proof WAS the root, so nothing to renumber
      return old;
    end if;
  end if;

  -- Now renumber all remaining proofs in this version chain
  -- Order by created_at to maintain chronological order
  new_version_num := 1;

  for version_rec in
    -- Find all proofs that have this root_id in their parent chain
    with recursive version_chain as (
      -- Start with the root
      select id, parent_proof_id, created_at from public.proofs where id = v_root_id
      union all
      -- Recursively get all descendants
      select p.id, p.parent_proof_id, p.created_at
      from public.proofs p
      join version_chain vc on p.parent_proof_id = vc.id
    )
    select id
    from version_chain
    order by created_at asc
  loop
    update public.proofs
    set version_number = new_version_num
    where id = version_rec.id;

    new_version_num := new_version_num + 1;
  end loop;

  return old;
end;
$$ language plpgsql security definer
set search_path = public;

-- ============================================================================
-- Recreate the trigger
-- ============================================================================
create trigger renumber_versions_trigger
  after delete on public.proofs
  for each row
  execute function renumber_versions_after_delete();

-- ============================================================================
-- Add comment
-- ============================================================================
comment on function renumber_versions_after_delete() is
  'Renumbers proof versions after deletion. Uses parent_proof_id chain to find related versions. Security definer with explicit search_path.';
