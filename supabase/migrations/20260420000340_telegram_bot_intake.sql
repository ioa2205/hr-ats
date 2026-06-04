-- 340_telegram_bot_intake.sql
-- Phase 3b — Telegram BOT intake for company-OWNED CV channels.
--
-- Complements the Phase 3 MTProto user-session connector (which reads PUBLIC
-- channels the company doesn't own). A company that runs its own Telegram CV
-- intake channel adds the TezHR bot as an administrator and registers the
-- channel handle here; the bot then ingests every new post into telegram_posts,
-- classifies it ONCE (cached), and the sourcing funnel reads candidates from
-- the staging table — no MTProto session needed for owned channels, just the
-- existing TELEGRAM_BOT_TOKEN.
--
-- Why a staging table (vs. on-demand reads like the MTProto path): the Bot API
-- has NO get-history method — a bot only receives a channel_post update as it is
-- posted and can never re-fetch it. So the bot MUST persist each post as it
-- arrives. That persistence is also the cost win: each post is classified once
-- at ingest (job-independent: candidate_cv vs vacancy/ad + provenance-tagged
-- field extraction), not once per search. Per-job judging stays in the funnel.
--
-- Freshness ("won't surface anyone older than ~3 months"): the search window AND
-- the nightly TTL purge share a 90-day horizon, so the pool self-prunes and a
-- search never re-surfaces a stale post. See TELEGRAM_INTAKE_RETENTION_DAYS.
--
-- PII note: this stores posts (CVs) of people who have not applied. The 90-day
-- purge is the retention control; RLS confines reads to the owning company's
-- members + operators. Mirrors the sourced_candidates TTL discipline (310).

-- ===================================================================
-- telegram_intake_channels — per-company registry of OWNED channels the
-- bot ingests. A channel handle is claimed by exactly one company (the
-- global unique index is the cross-tenant boundary: company B cannot ingest
-- a channel company A has registered).
-- ===================================================================
create table if not exists telegram_intake_channels (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  -- channel username, lowercased, WITHOUT a leading '@' (e.g. "acme_cv").
  handle      text not null,
  -- Telegram numeric chat id (negative for channels). Learned from the first
  -- ingested post; used as the reliable attribution key thereafter.
  chat_id     bigint,
  -- channel title, learned from the first post (display only).
  title       text,
  active      boolean not null default true,
  added_by    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One company per channel handle (first claim wins) — the tenant boundary.
create unique index if not exists uq_telegram_channels_handle
  on telegram_intake_channels (handle);
-- One registration per numeric chat id once learned.
create unique index if not exists uq_telegram_channels_chat
  on telegram_intake_channels (chat_id)
  where chat_id is not null;
create index if not exists idx_telegram_channels_company
  on telegram_intake_channels (company_id);

drop trigger if exists trg_telegram_channels_updated_at on telegram_intake_channels;
create trigger trg_telegram_channels_updated_at
  before update on telegram_intake_channels
  for each row execute function set_updated_at();

-- ===================================================================
-- telegram_posts — staging table: one row per ingested channel post, with
-- the classification cached at ingest. The DB-backed reader surfaces
-- classification = 'candidate_cv' rows; the rest are kept (cheaply, no AI)
-- only to suppress re-classification on re-ingest.
-- ===================================================================
create table if not exists telegram_posts (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  -- channel handle (lowercased, no '@') the post came from.
  channel        text not null,
  chat_id        bigint,
  message_id     bigint not null,
  posted_at      timestamptz not null,
  text           text not null,
  url            text,
  -- which reader ingested it: the bot (owned channels) or the user session.
  source_mode    text not null default 'bot' check (source_mode in ('bot', 'user')),
  -- classification cache (null until the classify pass runs). Mirrors the
  -- connector's TelegramExtraction: 'candidate_cv' | 'vacancy' | 'ad' | 'other'.
  classification text,
  confidence     numeric(4, 3),
  extraction     jsonb,
  -- the resolved contact key (tg:@handle / tel:digits / eml:email) or null.
  contact_key    text,
  classified_at  timestamptz,
  ingested_at    timestamptz not null default now()
);

-- A post is unique within its channel (matches the t.me/<channel>/<id> identity).
create unique index if not exists uq_telegram_posts_channel_msg
  on telegram_posts (channel, message_id);
-- DB reader: newest candidate_cv posts per company channel.
create index if not exists idx_telegram_posts_candidates
  on telegram_posts (company_id, channel, posted_at desc)
  where classification = 'candidate_cv';
-- classify pass: the backlog of not-yet-classified posts.
create index if not exists idx_telegram_posts_unclassified
  on telegram_posts (ingested_at)
  where classification is null;
-- TTL purge horizon.
create index if not exists idx_telegram_posts_posted_at
  on telegram_posts (posted_at);

-- ===================================================================
-- telegram_ingest_state — singleton cursor for the bot getUpdates long-poll
-- offset. One bot ⇒ one platform-global cursor. service-role only.
-- ===================================================================
create table if not exists telegram_ingest_state (
  singleton      boolean primary key default true check (singleton),
  last_update_id bigint not null default 0,
  updated_at     timestamptz not null default now()
);
insert into telegram_ingest_state (singleton)
  values (true)
  on conflict (singleton) do nothing;

-- ===================================================================
-- RLS — owned-channel data is company-scoped (PII): members read their own
-- rows, operators read all, the service-role worker/ingest does all writes.
-- Mirrors sourced_candidates (310).
-- ===================================================================
alter table telegram_intake_channels enable row level security;

drop policy if exists telegram_channels_member_read on telegram_intake_channels;
create policy telegram_channels_member_read
  on telegram_intake_channels
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists telegram_channels_operator_read on telegram_intake_channels;
create policy telegram_channels_operator_read
  on telegram_intake_channels
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on telegram_intake_channels to authenticated;
grant select, insert, update, delete on telegram_intake_channels to service_role;

alter table telegram_posts enable row level security;

drop policy if exists telegram_posts_member_read on telegram_posts;
create policy telegram_posts_member_read
  on telegram_posts
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists telegram_posts_operator_read on telegram_posts;
create policy telegram_posts_operator_read
  on telegram_posts
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on telegram_posts to authenticated;
grant select, insert, update, delete on telegram_posts to service_role;

alter table telegram_ingest_state enable row level security;
-- No member/operator policy: only the service-role ingest touches the cursor.
grant select, insert, update on telegram_ingest_state to service_role;

-- ===================================================================
-- purge_stale_telegram_posts — TTL cleanup. Deletes posts past the 90-day
-- retention horizon (keep this in sync with TELEGRAM_INTAKE_RETENTION_DAYS).
-- ===================================================================
create or replace function purge_stale_telegram_posts(p_max_age_days int default 90)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  delete from telegram_posts
   where posted_at < now() - make_interval(days => greatest(coalesce(p_max_age_days, 90), 1));
  get diagnostics v_deleted = row_count;
  raise notice '[sourcing] telegram ttl purge: % posts', v_deleted;
end; $$;

revoke all on function purge_stale_telegram_posts(int) from public;
grant execute on function purge_stale_telegram_posts(int) to service_role;

-- ===================================================================
-- pg_cron jobs (mirror 330's Vault-backed HTTP crons). All idempotent via the
-- unschedule-in-DO guard. The ingest job pings the Next.js route, which polls
-- the bot's getUpdates, persists new posts, and classifies them.
-- ===================================================================

-- telegram-bot-ingest (every 2 min). Re-invokes the Next.js ingest route, which
-- authenticates with the service-role key (verified in-route). A no-op when the
-- bot token / registered channels are absent.
do $$
begin
  perform cron.unschedule('telegram-bot-ingest');
exception when others then
  null;
end $$;

select cron.schedule(
  'telegram-bot-ingest',
  '*/2 * * * *',
  $$
    select net.http_post(
      url     := app_cron_secret('app_url') || '/api/internal/telegram/ingest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || app_cron_secret('service_role_key')
      ),
      body    := '{}'::jsonb::text
    );
  $$
);

-- telegram-posts-purge (nightly 03:50) — after the sourcing purge (03:45).
do $$
begin
  perform cron.unschedule('telegram-posts-purge');
exception when others then
  null;
end $$;

select cron.schedule(
  'telegram-posts-purge',
  '50 3 * * *',
  $$ select purge_stale_telegram_posts(90) $$
);
