-- Remove any prior versions of these jobs to keep idempotent
DO $$
BEGIN
  PERFORM cron.unschedule('aggregate-sales-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('aggregate-sales-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('aggregate-sales-monthly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'aggregate-sales-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zuymqduavlhdsmppmnga.supabase.co/functions/v1/aggregate-sales',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eW1xZHVhdmxoZHNtcHBtbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NzYsImV4cCI6MjA4NjAzNDQ3Nn0.GxJdWWhL23t81jorBcudRFF2e5jskKY4C_EXBT-7MWo"}'::jsonb,
    body := '{"granularity":"daily","lookback_days":7}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'aggregate-sales-weekly',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://zuymqduavlhdsmppmnga.supabase.co/functions/v1/aggregate-sales',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eW1xZHVhdmxoZHNtcHBtbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NzYsImV4cCI6MjA4NjAzNDQ3Nn0.GxJdWWhL23t81jorBcudRFF2e5jskKY4C_EXBT-7MWo"}'::jsonb,
    body := '{"granularity":"weekly","lookback_days":60}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'aggregate-sales-monthly',
  '0 5 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://zuymqduavlhdsmppmnga.supabase.co/functions/v1/aggregate-sales',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eW1xZHVhdmxoZHNtcHBtbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NzYsImV4cCI6MjA4NjAzNDQ3Nn0.GxJdWWhL23t81jorBcudRFF2e5jskKY4C_EXBT-7MWo"}'::jsonb,
    body := '{"granularity":"monthly","lookback_days":400}'::jsonb
  );
  $$
);