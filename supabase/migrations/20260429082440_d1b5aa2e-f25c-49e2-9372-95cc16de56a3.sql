CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if present, then create
DO $$
BEGIN
  PERFORM cron.unschedule('sync-pos-sales-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-pos-sales-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuymqduavlhdsmppmnga.supabase.co/functions/v1/sync-pos-sales',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eW1xZHVhdmxoZHNtcHBtbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NzYsImV4cCI6MjA4NjAzNDQ3Nn0.GxJdWWhL23t81jorBcudRFF2e5jskKY4C_EXBT-7MWo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
