-- Add expiry tracking to proofs table
alter table public.proofs
  add column if not exists expires_at timestamptz,
  add column if not exists description text,
  add column if not exists expiry_email_sent_at timestamptz;

-- Create index for efficient cleanup queries
create index if not exists idx_proofs_expires_at on public.proofs(expires_at)
  where expires_at is not null;

-- Create index for email notification queries
create index if not exists idx_proofs_expiry_email on public.proofs(user_id, expires_at, expiry_email_sent_at)
  where expires_at is not null and expiry_email_sent_at is null;

-- Add comment explaining the columns
comment on column public.proofs.expires_at is 'When this proof will be automatically deleted. NULL means permanent storage (paid tier).';
comment on column public.proofs.description is 'User-provided description of the proof.';
comment on column public.proofs.expiry_email_sent_at is 'Timestamp when the 4-hour expiry warning email was sent (free tier only).';

-- Create function to set expiry for free tier users
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
$$ language plpgsql security definer;

-- Create trigger to automatically set expiry on proof creation
drop trigger if exists set_proof_expiry_on_insert on public.proofs;
create trigger set_proof_expiry_on_insert
  before insert on public.proofs
  for each row
  execute function public.set_proof_expiry();

-- Create function to delete expired proofs
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
$$ language plpgsql security definer;

-- Add RLS policy update to allow deleting own proofs
drop policy if exists "Users can update own proofs" on public.proofs;
create policy "Users can update own proofs"
  on public.proofs for update
  using (auth.uid() = user_id);
