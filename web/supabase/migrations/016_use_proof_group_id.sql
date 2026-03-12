-- FINAL FIX: Use proof_group_id instead of fragile parent chains
-- This is more reliable than trying to maintain parent_proof_id relationships

-- ============================================================================
-- STEP 1: Set all "44 files" proofs to use the same proof_group_id
-- ============================================================================
-- Use the oldest proof's ID as the group ID (version 1's ID)
update proofs
set proof_group_id = '03071da0-d57a-42f6-be56-b1818ba2ad91'
where file_name = '44 files';

-- ============================================================================
-- STEP 2: Fix the parent chain one last time
-- ============================================================================
-- v7 should point to v6
update proofs
set parent_proof_id = '5e9264f3-aac0-4a78-84d4-331d6d93c1e1'
where id = 'b039c143-27ae-41f1-b39f-c7caa004d827';

-- ============================================================================
-- STEP 3: Renumber all versions 1-9 chronologically
-- ============================================================================
do $$
declare
  proof_rec record;
  new_version integer := 1;
begin
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
-- STEP 4: Update all tags to use the correct root
-- ============================================================================
update proof_tags
set root_proof_id = '03071da0-d57a-42f6-be56-b1818ba2ad91'
where proof_id in (
  select id from proofs where file_name = '44 files'
);

-- ============================================================================
-- STEP 5: Create helper function to get root by proof_group_id
-- ============================================================================
create or replace function public.get_root_by_group_id(p_proof_id uuid)
returns uuid as $$
declare
  v_group_id text;
  v_root_id uuid;
begin
  -- Get the proof_group_id for this proof
  select proof_group_id into v_group_id
  from public.proofs
  where id = p_proof_id;

  -- If it has a group_id, find the oldest proof in that group
  if v_group_id is not null then
    select id into v_root_id
    from public.proofs
    where proof_group_id = v_group_id
    order by created_at asc
    limit 1;

    return v_root_id;
  end if;

  -- Fallback: use parent chain logic
  return public.get_root_proof_id(p_proof_id);
end;
$$ language plpgsql security definer
set search_path = public;

comment on function public.get_root_by_group_id(uuid) is
  'Returns the root proof ID using proof_group_id (more reliable than parent chains). Security definer with explicit search_path.';
