-- 260_notification_deliveries.sql
-- P0-1: real email delivery pipeline. Previously lib/notifications/dispatch.ts
-- logged "dispatch intent" but never actually sent through Resend. This
-- migration introduces delivery tracking + bounce suppression + retry.

-- ===================================================================
-- Enums
-- ===================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_delivery_status') then
    create type notification_delivery_status as enum (
      'queued',
      'sending',
      'sent',
      'failed',
      'bounced',
      'suppressed'
    );
  end if;
end $$;

-- ===================================================================
-- notification_deliveries — one row per email attempt, append + update.
-- ===================================================================
create table if not exists notification_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  notification_id     uuid references notifications(id) on delete set null,
  company_id          uuid not null references companies(id) on delete cascade,
  user_id             uuid references profiles(id) on delete set null,
  recipient_email     text not null,
  event               notification_event_kind not null,
  subject             text not null,
  status              notification_delivery_status not null default 'queued',
  attempts            integer not null default 0,
  last_error          text,
  resend_message_id   text,
  next_retry_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  sent_at             timestamptz
);

create index if not exists idx_nd_company_created
  on notification_deliveries(company_id, created_at desc);
create index if not exists idx_nd_retry
  on notification_deliveries(next_retry_at)
  where status in ('queued', 'failed') and next_retry_at is not null;
create index if not exists idx_nd_resend_message
  on notification_deliveries(resend_message_id)
  where resend_message_id is not null;
create index if not exists idx_nd_recipient
  on notification_deliveries(recipient_email);

drop trigger if exists trg_notification_deliveries_updated_at on notification_deliveries;
create trigger trg_notification_deliveries_updated_at
  before update on notification_deliveries
  for each row execute function set_updated_at();

alter table notification_deliveries enable row level security;

drop policy if exists nd_operator_read on notification_deliveries;
create policy nd_operator_read
  on notification_deliveries
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

drop policy if exists nd_member_read on notification_deliveries;
create policy nd_member_read
  on notification_deliveries
  for select
  to authenticated
  using (company_id in (select user_companies()));

grant select on notification_deliveries to authenticated;
grant select, insert, update on notification_deliveries to service_role;

-- ===================================================================
-- notification_suppressions — permanent bounce/complaint list.
-- ===================================================================
create table if not exists notification_suppressions (
  email       text primary key,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table notification_suppressions enable row level security;

drop policy if exists ns_operator_all on notification_suppressions;
create policy ns_operator_all
  on notification_suppressions
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on notification_suppressions to authenticated;
grant select, insert, update, delete on notification_suppressions to service_role;

-- ===================================================================
-- Retry cron: every minute, trigger the Next.js worker route which
-- picks up queued/failed rows past their next_retry_at and re-sends via
-- Resend. Follows the existing pattern from migration 021 (retry-pending-cvs).
-- ===================================================================
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
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/dispatch-notification-retries',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb::text
    );
  $$
);
