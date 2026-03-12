-- Add version control columns to proofs table
-- This enables tracking multiple versions of the same proof (same proof_name, different hashes)

-- Add parent_proof_id to link versions together
alter table public.proofs
  add column if not exists parent_proof_id uuid references public.proofs(id) on delete set null;

-- Add version_number to track version sequence
alter table public.proofs
  add column if not exists version_number integer default 1 check (version_number > 0);

-- Create index for performance when querying version chains
create index if not exists idx_proofs_parent_proof_id on public.proofs(parent_proof_id);
create index if not exists idx_proofs_proof_name on public.proofs(proof_name);

-- Create a view to easily get all versions of a proof grouped together
-- This shows the "root" proof and all its versions
create or replace view proof_versions as
select
  p.id,
  p.user_id,
  p.file_name,
  p.file_hash,
  p.proof_name,
  p.version_number,
  p.parent_proof_id,
  p.created_at,
  p.expires_at,
  -- Find the root proof (the original version)
  case
    when p.parent_proof_id is null then p.id
    else (
      with recursive version_chain as (
        select id, parent_proof_id from proofs where id = p.id
        union all
        select pr.id, pr.parent_proof_id
        from proofs pr
        join version_chain vc on pr.id = vc.parent_proof_id
      )
      select id from version_chain where parent_proof_id is null
    )
  end as root_proof_id
from public.proofs p;

-- Function to get the next version number for a proof name
create or replace function get_next_version_number(p_user_id uuid, p_proof_name text)
returns integer as $$
declare
  max_version integer;
begin
  select coalesce(max(version_number), 0) + 1
  into max_version
  from public.proofs
  where user_id = p_user_id
    and proof_name = p_proof_name;

  return max_version;
end;
$$ language plpgsql security definer;

-- Function to renumber versions after a deletion
-- This ensures version numbers are sequential without gaps
create or replace function renumber_versions_after_delete()
returns trigger as $$
declare
  version_rec record;
  new_version_num integer;
begin
  -- Only renumber if the deleted proof had a proof_name
  if old.proof_name is not null then
    new_version_num := 1;

    -- Renumber all remaining proofs with the same proof_name
    for version_rec in
      select id
      from public.proofs
      where user_id = old.user_id
        and proof_name = old.proof_name
      order by version_number asc, created_at asc
    loop
      update public.proofs
      set version_number = new_version_num
      where id = version_rec.id;

      new_version_num := new_version_num + 1;
    end loop;
  end if;

  return old;
end;
$$ language plpgsql security definer;

-- Create trigger to renumber versions after deletion
drop trigger if exists renumber_versions_trigger on public.proofs;
create trigger renumber_versions_trigger
  after delete on public.proofs
  for each row
  execute function renumber_versions_after_delete();

-- Grant necessary permissions
grant select on proof_versions to authenticated;
grant execute on function get_next_version_number(uuid, text) to authenticated;

-- Add comment
comment on column public.proofs.parent_proof_id is 'Links to the previous version of this proof (null for v1)';
comment on column public.proofs.version_number is 'Version number for proofs with the same proof_name';
