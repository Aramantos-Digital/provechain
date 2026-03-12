-- Create proofs table
create table if not exists public.proofs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  file_name text not null,
  file_hash text not null,
  file_size bigint,
  timestamp timestamptz not null,
  proof_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index if not exists idx_proofs_user_id on public.proofs(user_id);
create index if not exists idx_proofs_created_at on public.proofs(created_at desc);
create index if not exists idx_proofs_file_hash on public.proofs(file_hash);

-- Enable Row Level Security
alter table public.proofs enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own proofs" on public.proofs;
drop policy if exists "Users can create own proofs" on public.proofs;
drop policy if exists "Users can delete own proofs" on public.proofs;

-- Users can only see their own proofs
create policy "Users can view own proofs"
  on public.proofs for select
  using (auth.uid() = user_id);

-- Users can create their own proofs
create policy "Users can create own proofs"
  on public.proofs for insert
  with check (auth.uid() = user_id);

-- Users can delete their own proofs
create policy "Users can delete own proofs"
  on public.proofs for delete
  using (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to call the function
drop trigger if exists set_updated_at on public.proofs;
create trigger set_updated_at
  before update on public.proofs
  for each row
  execute function public.handle_updated_at();
