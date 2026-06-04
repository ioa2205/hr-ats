-- 380_notification_retry_worker.sql
-- Fix the broken notification retry path. Migration 260 scheduled a
-- `dispatch-notification-retries` cron that POSTed to a Supabase Edge Function
-- (`/functions/v1/dispatch-notification-retries`) that was never created, so
-- queued (quiet-hours) and failed email deliveries never drained. The retry
-- logic needs Node-only modules (Resend send + email templates), so it lives in
-- a Next.js worker route, mirroring source-candidates-pickup (migration 330).

-- Persist the rendered HTML so the retry worker can re-send faithfully. The row
-- already carries subject + event; the body was never stored. Nullable so legacy
-- rows are tolerated (the worker terminally fails any retry row with no body).
alter table notification_deliveries add column if not exists body_html text;

-- Repoint the cron at the Next.js worker route (Vault-backed, mirrors 330).
do $$
begin
  perform cron.unschedule('dispatch-notification-retries');
exception when others then
  null;
end $$;

select cron.schedule(
  'dispatch-notification-retries',
  '* * * * *',
  $$
    select net.http_post(
      url     := app_cron_secret('app_url') || '/api/internal/notifications/dispatch-retries',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || app_cron_secret('service_role_key')
      ),
      body    := '{}'::jsonb::text
    );
  $$
);
