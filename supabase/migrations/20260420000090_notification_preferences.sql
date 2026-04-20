-- 090_notification_preferences.sql
-- Per-(user, company) notification preferences plus an append-only
-- notifications log consumed by the in-app bell via Realtime.
--
-- Apply via `supabase db push` — the trigger body uses plpgsql and would be
-- torn apart by the Supabase Studio SQL editor's semicolon splitter.

-- ===================================================================
-- notification_preferences — one row per (user, company) pair.
-- ===================================================================
create table notification_preferences (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references profiles(id) on delete cascade,
  company_id                   uuid not null references companies(id) on delete cascade,
  -- Email channel
  email_new_application        boolean not null default true,
  email_top_pick               boolean not null default true,
  email_interview_booked       boolean not null default true,
  email_interview_declined     boolean not null default true,
  email_quota_warning          boolean not null default true,
  email_weekly_digest          boolean not null default true,
  -- In-app (Realtime banner) channel
  inapp_new_application        boolean not null default true,
  inapp_top_pick               boolean not null default true,
  inapp_interview_booked       boolean not null default true,
  inapp_interview_declined     boolean not null default true,
  inapp_ai_failed              boolean not null default true,
  -- Cadence
  digest_hour                  smallint not null default 9
                               check (digest_hour between 0 and 23),
  quiet_hours_start            smallint
                               check (quiet_hours_start is null or
                                      quiet_hours_start between 0 and 23),
  quiet_hours_end              smallint
                               check (quiet_hours_end is null or
                                      quiet_hours_end between 0 and 23),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  unique (user_id, company_id)
);

create index np_user_company_idx on notification_preferences(user_id, company_id);

-- ===================================================================
-- notifications — append-only log of dispatched in-app notifications.
-- Email dispatch stub logs intent; in-app rows land here and Realtime
-- streams them to the HR top-bar bell.
-- ===================================================================
create type notification_event_kind as enum (
  'new_application',
  'top_pick',
  'interview_booked',
  'interview_declined',
  'ai_failed',
  'quota_warning'
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  user_id       uuid references profiles(id) on delete cascade,
  event         notification_event_kind not null,
  entity_type   text,
  entity_id     uuid,
  title         text not null,
  body          text,
  metadata      jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index notif_user_unread_idx on notifications(user_id, read_at)
  where read_at is null;
create index notif_company_created_idx on notifications(company_id, created_at desc);

-- ===================================================================
-- Triggers
-- ===================================================================
create trigger trg_notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function set_updated_at();

-- Auto-create default prefs when a user joins a company.
create or replace function tg_default_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notification_preferences (user_id, company_id)
    values (new.user_id, new.company_id)
    on conflict (user_id, company_id) do nothing;
  return new;
end;
$$;

create trigger trg_company_members_default_notif_prefs
  after insert on company_members
  for each row execute function tg_default_notification_prefs();

-- Backfill defaults for existing memberships.
insert into notification_preferences (user_id, company_id)
  select user_id, company_id from company_members
  on conflict (user_id, company_id) do nothing;

-- ===================================================================
-- RLS
-- ===================================================================
alter table notification_preferences enable row level security;
alter table notifications            enable row level security;

create policy np_self_read on notification_preferences
  for select using (user_id = auth.uid());

create policy np_self_update on notification_preferences
  for update using (user_id = auth.uid());

create policy np_self_insert on notification_preferences
  for insert with check (user_id = auth.uid());

create policy np_operator_read on notification_preferences
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- Users see notifications addressed to them personally, or company-wide
-- broadcasts in companies they belong to. Operators see everything.
create policy notif_member_read on notifications
  for select using (
    user_id = auth.uid()
    or (user_id is null and company_id in (select user_companies()))
  );

create policy notif_member_update on notifications
  for update using (
    user_id = auth.uid()
    or (user_id is null and company_id in (select user_companies()))
  );

create policy notif_operator_read on notifications
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- Realtime — stream inserts so the top-bar bell can light up live.
-- ===================================================================
alter publication supabase_realtime add table notifications;
