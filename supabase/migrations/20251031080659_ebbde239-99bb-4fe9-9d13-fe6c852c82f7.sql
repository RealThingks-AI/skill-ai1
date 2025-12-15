-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule monthly project reminders to run on the 1st of each month at 9 AM UTC
SELECT cron.schedule(
  'monthly-project-reminders',
  '0 9 1 * *', -- At 09:00 on day-of-month 1
  $$
  SELECT
    net.http_post(
        url:='https://hgpzeotwrjicbhncvynn.supabase.co/functions/v1/monthly-project-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncHplb3R3cmppY2JobmN2eW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTgyOTAsImV4cCI6MjA3NzEzNDI5MH0.o0AE6ThbVrg1oK67ad1saf_pheNWuxtm_ogMnGRjc1A"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);