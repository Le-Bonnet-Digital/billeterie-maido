-- Enable pg_cron extension for scheduling tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if present to avoid duplicates
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup_expired_cart_items';

-- Schedule cleanup of expired cart items every 15 minutes
SELECT
  cron.schedule(
    'cleanup_expired_cart_items',
    '*/15 * * * *',
    $$SELECT public.cleanup_expired_cart_items();$$
  );
