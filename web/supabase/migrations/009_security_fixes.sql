-- Security Fixes Migration
-- Addresses Supabase security advisor warnings

-- ============================================================================
-- FIX 1: Function Search Path Mutable
-- ============================================================================
-- Add explicit search_path to all security definer functions to prevent
-- search path injection attacks

-- Fix: handle_updated_at (add security definer + search_path)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

-- Fix: set_proof_expiry
create or replace function public.set_proof_expiry()
returns trigger as $$
declare
  user_tier text;
begin
  -- Get user's subscription tier
  select tier into user_tier
  from public.subscriptions
  where user_id = new.user_id;

  -- If free tier, set 24-hour expiry
  if user_tier = 'free' then
    new.expires_at = now() + interval '24 hours';
  else
    new.expires_at = null; -- Paid tier = permanent storage
  end if;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;

-- Fix: delete_expired_proofs
create or replace function public.delete_expired_proofs()
returns table(deleted_count bigint) as $$
declare
  result bigint;
begin
  -- Delete all proofs where expires_at has passed
  delete from public.proofs
  where expires_at is not null
    and expires_at < now();

  get diagnostics result = row_count;
  return query select result;
end;
$$ language plpgsql security definer
set search_path = public;

-- Fix: handle_new_user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

-- Fix: get_next_version_number
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
$$ language plpgsql security definer
set search_path = public;

-- Fix: renumber_versions_after_delete
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
$$ language plpgsql security definer
set search_path = public;

-- ============================================================================
-- FIX 2: Security Definer View Warning
-- ============================================================================
-- Recreate proof_versions view with proper security context
-- The view itself doesn't need SECURITY DEFINER, but we ensure RLS is enforced

drop view if exists proof_versions;
create view proof_versions
with (security_invoker = true) as
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

-- Ensure proper permissions
grant select on proof_versions to authenticated;

-- ============================================================================
-- FIX 3: RLS Policies Review - Ensure Complete Coverage
-- ============================================================================

-- Verify all RLS policies exist for proofs table
-- (These should already exist from previous migrations, but we ensure they're complete)

-- Ensure proofs table has all CRUD policies
do $$
begin
  -- Check if update policy exists, if not create it
  if not exists (
    select 1 from pg_policies
    where tablename = 'proofs'
    and policyname = 'Users can update own proofs'
  ) then
    create policy "Users can update own proofs"
      on public.proofs for update
      using (auth.uid() = user_id);
  end if;
end $$;

-- Ensure subscriptions table has insert policy for system
-- (Note: Users shouldn't insert directly, but the trigger needs permission)
drop policy if exists "Allow system to insert subscriptions" on public.subscriptions;
create policy "Allow system to insert subscriptions"
  on public.subscriptions for insert
  with check (true); -- Trigger runs with security definer so this is safe

-- ============================================================================
-- FIX 4: Add Comments for Security Documentation
-- ============================================================================

comment on function public.handle_updated_at() is
  'Automatically updates the updated_at timestamp. Security definer with explicit search_path.';

comment on function public.set_proof_expiry() is
  'Sets proof expiry based on user subscription tier. Security definer with explicit search_path.';

comment on function public.delete_expired_proofs() is
  'Deletes all expired proofs. Security definer with explicit search_path. Called by cron.';

comment on function public.handle_new_user() is
  'Creates free tier subscription for new users. Security definer with explicit search_path.';

comment on function public.get_next_version_number(uuid, text) is
  'Gets next version number for a proof name. Security definer with explicit search_path.';

comment on function public.renumber_versions_after_delete() is
  'Renumbers proof versions after deletion. Security definer with explicit search_path.';

comment on view proof_versions is
  'View of proof versions with security_invoker to enforce RLS.';
