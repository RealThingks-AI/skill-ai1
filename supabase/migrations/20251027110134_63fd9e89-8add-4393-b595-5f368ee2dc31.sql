-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily auto-backup at 3 AM
SELECT cron.schedule(
  'daily-auto-backup',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://tlvlorqapxfdisoksjah.supabase.co/functions/v1/auto-backup',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdmxvcnFhcHhmZGlzb2tzamFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDgyMjYsImV4cCI6MjA3NzEyNDIyNn0.g1viMSsoUrlR3hxhadFLtgNK-d1O45EijYC5pGq9dvE"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);