-- Create subscriptions table to track user subscription status
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,

  -- Subscription tier: 'free' or 'paid'
  tier text not null default 'free' check (tier in ('free', 'paid')),

  -- Stripe subscription details (null for free tier)
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  -- Subscription status: 'active', 'canceled', 'past_due', 'unpaid'
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),

  -- When the current billing period ends (for paid subscriptions)
  current_period_end timestamptz,

  -- When subscription was canceled (null if still active)
  canceled_at timestamptz,

  -- When proofs will be deleted (set when subscription ends)
  proofs_expire_at timestamptz,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster lookups
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription_id on public.subscriptions(stripe_subscription_id);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view own subscription" on public.subscriptions;
drop policy if exists "Users can update own subscription" on public.subscriptions;

-- Users can only see their own subscription
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Users cannot update their own subscription (only webhooks/admin can)
-- But we'll allow it for now and restrict via API
create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- Create trigger for updated_at
drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.handle_updated_at();

-- Create function to automatically create free tier subscription on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill existing users with free tier subscriptions
insert into public.subscriptions (user_id, tier, status)
select id, 'free', 'active'
from auth.users
where id not in (select user_id from public.subscriptions)
on conflict (user_id) do nothing;
