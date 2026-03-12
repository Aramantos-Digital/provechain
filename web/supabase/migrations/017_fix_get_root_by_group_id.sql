-- Fix get_root_by_group_id function - v_group_id should be uuid not text
-- This fixes the "operator does not exist: uuid = text" error

create or replace function public.get_root_by_group_id(p_proof_id uuid)
returns uuid as $$
declare
  v_group_id uuid;  -- Changed from text to uuid
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
