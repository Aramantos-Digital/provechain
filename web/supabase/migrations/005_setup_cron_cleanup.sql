-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Schedule a cron job to delete expired proofs every hour
-- Runs at minute 0 of every hour (e.g., 1:00, 2:00, 3:00, etc.)
select cron.schedule(
  'delete-expired-proofs',      -- Job name
  '0 * * * *',                  -- Cron expression: every hour at minute 0
  $$
    select public.delete_expired_proofs();
  $$
);

-- View scheduled jobs
-- Run this query to verify the cron job was created:
-- SELECT * FROM cron.job;

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('delete-expired-proofs');

-- Note: pg_cron may not be available on all Supabase plans
-- For free tier, you may need to use a Vercel Cron or external cron service
-- to call the API route instead
