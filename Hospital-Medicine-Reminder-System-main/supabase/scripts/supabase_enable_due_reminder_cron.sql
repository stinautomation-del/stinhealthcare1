-- ============================================================================
-- CRITICAL: Configure server-side cron to process due nurse reminders.
-- This cron job automatically sends pending reminders at their scheduled times.
-- MUST be run once in your Supabase project to enable automatic reminder delivery.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Safely drop existing job if present, then recreate.
do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'process-due-reminders-every-minute'
  ) then
    perform cron.unschedule('process-due-reminders-every-minute');
  end if;
end
$$;

-- Schedule the cron job to run every minute (* * * * *).
-- This checks for pending reminders where scheduledAt <= now() and sends them.
-- All times are in UTC; the frontend converts local time to UTC when creating reminders.
select cron.schedule(
  'process-due-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY',
      'apikey', 'YOUR_SUPABASE_ANON_KEY'
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'limit', 200
    )
  ) as request_id;
  $$
);

-- Verify job was created successfully.
-- Output should show 1 row with active = true.
select 
  jobid, 
  jobname, 
  schedule, 
  active,
  username,
  nodename
from cron.job
where jobname = 'process-due-reminders-every-minute';

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. This cron job MUST be executed once to enable automatic reminders.
-- 2. If the output above shows no rows or active = false, check:
--    - That pg_cron and pg_net extensions are enabled
--    - Your Supabase project allows pg_cron (most projects do)
--    - The project URL and anon key above match the deployed Supabase project
-- 3. Times in nurse_reminders.scheduledAt are stored in UTC.
-- 4. The frontend automatically converts local browser time to UTC.
-- 5. Cron runs every minute and sends reminders where scheduledAt <= current_time_utc.
-- 6. Reminders can also be sent immediately via the "Run Due Reminders Now" button.
-- ============================================================================

