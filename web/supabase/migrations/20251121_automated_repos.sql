-- Migration: Add automated GitHub repo integration
-- Created: 2025-11-21
-- Purpose: Allow users to automatically create proofs from GitHub repos on a schedule

-- ============================================================================
-- 1. Create automated_repos table
-- ============================================================================

CREATE TABLE public.automated_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- GitHub repo details
  repo_full_name text NOT NULL, -- e.g., "username/repo-name"
  repo_url text NOT NULL, -- full GitHub URL
  repo_owner text NOT NULL, -- GitHub username/org
  repo_name text NOT NULL, -- Repository name

  -- Scheduling
  schedule text NOT NULL DEFAULT 'daily' CHECK (schedule IN ('daily', 'weekly')),

  -- Change detection
  last_commit_sha text, -- Last processed commit SHA
  last_run_at timestamptz, -- When cron last ran
  last_status text DEFAULT 'pending' CHECK (last_status IN ('pending', 'success', 'error', 'skipped')),
  last_error text, -- Error message if failed

  -- Proof tracking
  last_proof_id uuid REFERENCES proofs(id) ON DELETE SET NULL,

  -- Status
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure one user doesn't add same repo multiple times
  UNIQUE(user_id, repo_full_name)
);

-- Index for efficient queries
CREATE INDEX idx_automated_repos_user_id ON automated_repos(user_id);
CREATE INDEX idx_automated_repos_active ON automated_repos(is_active) WHERE is_active = true;
CREATE INDEX idx_automated_repos_schedule ON automated_repos(schedule, last_run_at) WHERE is_active = true;

-- ============================================================================
-- 2. Extend proofs table for automated GitHub proofs
-- ============================================================================

ALTER TABLE public.proofs
  ADD COLUMN is_automated boolean DEFAULT false,
  ADD COLUMN automated_repo_id uuid REFERENCES automated_repos(id) ON DELETE SET NULL,
  ADD COLUMN commit_sha text, -- GitHub commit SHA
  ADD COLUMN repo_url text, -- GitHub repo URL
  ADD COLUMN branch_name text DEFAULT 'main'; -- Git branch

-- Index for querying automated proofs
CREATE INDEX idx_proofs_automated ON proofs(is_automated) WHERE is_automated = true;
CREATE INDEX idx_proofs_automated_repo_id ON proofs(automated_repo_id) WHERE automated_repo_id IS NOT NULL;

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE automated_repos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own automated repos
CREATE POLICY automated_repos_select_policy ON automated_repos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own automated repos
CREATE POLICY automated_repos_insert_policy ON automated_repos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own automated repos
CREATE POLICY automated_repos_update_policy ON automated_repos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own automated repos
CREATE POLICY automated_repos_delete_policy ON automated_repos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_automated_repos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automated_repos_updated_at_trigger
  BEFORE UPDATE ON automated_repos
  FOR EACH ROW
  EXECUTE FUNCTION update_automated_repos_updated_at();

-- ============================================================================
-- 5. Function to check tier limits for automated repos
-- ============================================================================

CREATE OR REPLACE FUNCTION check_automated_repo_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  user_tier text;
  max_allowed integer;
BEGIN
  -- Get current count of active automated repos
  SELECT COUNT(*) INTO current_count
  FROM automated_repos
  WHERE user_id = NEW.user_id AND is_active = true;

  -- Get user's tier
  SELECT tier INTO user_tier
  FROM subscriptions
  WHERE user_id = NEW.user_id AND status = 'active';

  -- Default to free if no subscription
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Determine max allowed repos based on tier
  CASE user_tier
    WHEN 'free' THEN max_allowed := 0;
    WHEN 'founder' THEN max_allowed := 3;
    WHEN 'pro' THEN max_allowed := 3;
    WHEN 'professional' THEN max_allowed := 10;
    WHEN 'business' THEN max_allowed := 25;
    WHEN 'enterprise' THEN max_allowed := 999999; -- unlimited
    ELSE max_allowed := 0;
  END CASE;

  -- Check if limit exceeded
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Automated repo limit reached. Your % tier allows % automated repos.', user_tier, max_allowed;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_automated_repo_limit_trigger
  BEFORE INSERT ON automated_repos
  FOR EACH ROW
  EXECUTE FUNCTION check_automated_repo_limit();

-- ============================================================================
-- 6. Function to process automated repos (called by cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_automated_repos()
RETURNS void AS $$
DECLARE
  repo_record RECORD;
  next_run timestamptz;
BEGIN
  -- Process repos that are due for a run
  FOR repo_record IN
    SELECT *
    FROM automated_repos
    WHERE is_active = true
      AND (
        last_run_at IS NULL OR
        (schedule = 'daily' AND last_run_at < now() - interval '1 day') OR
        (schedule = 'weekly' AND last_run_at < now() - interval '7 days')
      )
  LOOP
    -- Update last_run_at to prevent duplicate processing
    UPDATE automated_repos
    SET last_run_at = now(),
        last_status = 'pending'
    WHERE id = repo_record.id;

    -- The actual repo fetching and proof creation will be handled by API
    -- This function just marks repos as ready to be processed
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Set up pg_cron job (runs every hour to check for due repos)
-- ============================================================================

-- Note: This requires pg_cron extension to be enabled
-- Run this separately in Supabase SQL Editor:
-- SELECT cron.schedule(
--   'process-automated-repos',
--   '0 * * * *', -- Every hour at minute 0
--   $$SELECT process_automated_repos()$$
-- );

-- ============================================================================
-- 8. Add notification type for automated repo errors
-- ============================================================================

-- Extend notification type enum
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('team_invitation', 'proof_shared', 'system', 'automated_repo_error', 'automated_repo_success'));

-- ============================================================================
-- Migration complete!
-- ============================================================================

-- To verify migration:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automated_repos';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'proofs' AND column_name IN ('is_automated', 'automated_repo_id');
