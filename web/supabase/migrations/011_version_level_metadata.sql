-- Version-Level Metadata and Group-Level Tags
-- Implements two-level metadata system: group-level (root proof) vs version-level

-- ============================================================================
-- PART 1: Add version_notes column to proofs table
-- ============================================================================

-- Add version_notes column for version-specific descriptions
alter table public.proofs
add column if not exists version_notes text;

-- Add comment for documentation
comment on column public.proofs.version_notes is 'Version-specific notes describing what changed in this version. Required for versions 2+.';

-- ============================================================================
-- PART 2: Helper function to get root_proof_id
-- ============================================================================

-- This function finds the root proof ID for any proof in a version chain
create or replace function public.get_root_proof_id(p_proof_id uuid)
returns uuid as $$
declare
  v_root_id uuid;
begin
  -- Use the existing proof_versions view logic
  with recursive version_chain as (
    select id, parent_proof_id from public.proofs where id = p_proof_id
    union all
    select pr.id, pr.parent_proof_id
    from public.proofs pr
    join version_chain vc on pr.id = vc.parent_proof_id
  )
  select id into v_root_id
  from version_chain
  where parent_proof_id is null;

  return v_root_id;
end;
$$ language plpgsql security definer
set search_path = public;

comment on function public.get_root_proof_id(uuid) is
  'Returns the root proof ID for any proof in a version chain. Security definer with explicit search_path.';

-- ============================================================================
-- PART 3: Migrate existing proof_tags to use root_proof_id
-- ============================================================================

-- First, let's create a new table structure
-- We'll keep proof_id for now but add root_proof_id
alter table public.proof_tags
add column if not exists root_proof_id uuid references public.proofs(id) on delete cascade;

-- Populate root_proof_id for existing tags
update public.proof_tags
set root_proof_id = public.get_root_proof_id(proof_id)
where root_proof_id is null;

-- Create index on root_proof_id for performance
create index if not exists idx_proof_tags_root_proof_id on public.proof_tags(root_proof_id);

-- ============================================================================
-- PART 4: Update proof_tags to use composite key with root_proof_id
-- ============================================================================

-- Drop old primary key
alter table public.proof_tags drop constraint if exists proof_tags_pkey;

-- Create new primary key using tag_id and root_proof_id
-- This ensures one tag can only be attached once per proof GROUP (not per version)
alter table public.proof_tags
add constraint proof_tags_pkey primary key (root_proof_id, tag_id);

-- We can now drop the old proof_id column since we're using root_proof_id
-- But let's keep it for now to maintain compatibility during transition
-- alter table public.proof_tags drop column if exists proof_id;

-- ============================================================================
-- PART 5: Update RLS policies for proof_tags
-- ============================================================================

-- Drop old policies
drop policy if exists "Users can view tags on their proofs" on public.proof_tags;
drop policy if exists "Users can add tags to their proofs" on public.proof_tags;
drop policy if exists "Users can remove tags from their proofs" on public.proof_tags;

-- New SELECT policy - users can view tags on their proof groups
create policy "Users can view tags on their proof groups"
  on public.proof_tags for select
  using (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.root_proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- New INSERT policy - users can add tags to their proof groups
create policy "Users can add tags to their proof groups"
  on public.proof_tags for insert
  with check (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.root_proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- New DELETE policy - users can remove tags from their proof groups
create policy "Users can remove tags from their proof groups"
  on public.proof_tags for delete
  using (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.root_proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 6: Create view for easy tag querying
-- ============================================================================

-- View to easily get all tags for a proof (whether querying by proof_id or root_proof_id)
create or replace view public.proof_tags_with_root
with (security_invoker = true) as
select
  pt.proof_id,
  pt.tag_id,
  pt.root_proof_id,
  pt.created_at,
  t.name as tag_name,
  t.color as tag_color
from public.proof_tags pt
join public.tags t on t.id = pt.tag_id;

grant select on public.proof_tags_with_root to authenticated;

comment on view public.proof_tags_with_root is
  'View showing proof tags with tag details and root_proof_id for easy querying.';

-- ============================================================================
-- PART 7: Documentation
-- ============================================================================

comment on table public.proof_tags is
  'Many-to-many relationship between proof GROUPS and tags. Tags are attached at the group level (root_proof_id) and apply to all versions.';

comment on column public.proof_tags.root_proof_id is
  'The root proof ID (version 1) of the proof group. Tags are attached at group level, not individual versions.';
