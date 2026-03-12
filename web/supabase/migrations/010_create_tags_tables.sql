-- Create Tags System
-- Allows users to organize proofs with custom tags

-- ============================================================================
-- Create tags table
-- ============================================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null,
  color varchar(7) default '#8B5CF6', -- Hex color code (default: purple)
  created_at timestamptz default now(),

  -- Ensure unique tag names per user
  constraint unique_user_tag unique (user_id, name)
);

-- Index for fast lookups
create index if not exists idx_tags_user_id on public.tags(user_id);

-- ============================================================================
-- Create proof_tags junction table (many-to-many)
-- ============================================================================
create table if not exists public.proof_tags (
  proof_id uuid not null references public.proofs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz default now(),

  primary key (proof_id, tag_id)
);

-- Indexes for fast filtering
create index if not exists idx_proof_tags_proof_id on public.proof_tags(proof_id);
create index if not exists idx_proof_tags_tag_id on public.proof_tags(tag_id);

-- ============================================================================
-- Row Level Security - tags table
-- ============================================================================
alter table public.tags enable row level security;

-- Users can only see their own tags
drop policy if exists "Users can view their own tags" on public.tags;
create policy "Users can view their own tags"
  on public.tags for select
  using (auth.uid() = user_id);

-- Users can create their own tags
drop policy if exists "Users can create their own tags" on public.tags;
create policy "Users can create their own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

-- Users can update their own tags
drop policy if exists "Users can update their own tags" on public.tags;
create policy "Users can update their own tags"
  on public.tags for update
  using (auth.uid() = user_id);

-- Users can delete their own tags
drop policy if exists "Users can delete their own tags" on public.tags;
create policy "Users can delete their own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Row Level Security - proof_tags table
-- ============================================================================
alter table public.proof_tags enable row level security;

-- Users can only view tags on their own proofs
drop policy if exists "Users can view tags on their proofs" on public.proof_tags;
create policy "Users can view tags on their proofs"
  on public.proof_tags for select
  using (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- Users can add tags to their own proofs
drop policy if exists "Users can add tags to their proofs" on public.proof_tags;
create policy "Users can add tags to their proofs"
  on public.proof_tags for insert
  with check (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- Users can remove tags from their own proofs
drop policy if exists "Users can remove tags from their proofs" on public.proof_tags;
create policy "Users can remove tags from their proofs"
  on public.proof_tags for delete
  using (
    exists (
      select 1 from public.proofs
      where proofs.id = proof_tags.proof_id
      and proofs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments for documentation
-- ============================================================================
comment on table public.tags is 'User-created tags for organizing proofs';
comment on table public.proof_tags is 'Many-to-many relationship between proofs and tags';
comment on column public.tags.color is 'Hex color code for tag display (e.g., #8B5CF6)';
comment on constraint unique_user_tag on public.tags is 'Ensures each user has unique tag names';
