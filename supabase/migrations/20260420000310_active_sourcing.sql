-- 310_active_sourcing.sql
-- Phase 1.1 — Active (outbound) sourcing engine data model.
--
-- Adds the background sourcing pipeline tables, the atomic per-company
-- sourcing quota (mirrors try_consume_cv_quota's FOR UPDATE row-lock pattern),
-- and the pg_cron jobs for worker pickup / stuck-run recovery / TTL purge.
--
-- Accuracy guarantee (enforced in the funnel, reflected here): a sourced
-- candidate reaches the shortlist only with meets_all_requirements = true and
-- verified = true, each requirement carrying cited evidence in
-- requirement_results. Nothing here ever stores an inferred pass.
--
-- Metering (per product decision 2026-05-29): one unit per "Find candidates"
-- run (per-search). Trial companies get 2 runs (sourcing_quota_limit); the Pro
-- plan carries sourcing_quota_monthly = 50. As with cv_quota, runtime hard
-- enforcement today covers the trial counter only; 'active' (Pro) passes
-- through without bumping — monthly enforcement is a billing-layer follow-up
-- and the plan column is seeded for it.

-- ===================================================================
-- Enums (guarded; new types — safe to create + use in the same migration,
-- unlike ALTER TYPE ... ADD VALUE on an existing enum).
-- ===================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sourcing_status') then
    create type sourcing_status as enum (
      'queued',
      'running',
      'completed',
      'partial',
      'failed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'source_kind') then
    create type source_kind as enum (
      'internal_pool',
      'hh',
      'telegram',
      'linkedin_url'
    );
  end if;
end $$;

-- ===================================================================
-- Quota: extend subscriptions (trial counter) + subscription_plans (per-plan).
-- ===================================================================
alter table subscriptions
  add column if not exists sourcing_quota_used  int not null default 0,
  add column if not exists sourcing_quota_limit int not null default 2;

alter table subscription_plans
  add column if not exists sourcing_quota_monthly integer;

update subscription_plans
   set sourcing_quota_monthly = 50
 where code = 'pro_monthly_flat'
   and sourcing_quota_monthly is null;

-- ===================================================================
-- sourcing_searches — one row per "Find candidates" run.
-- ===================================================================
create table if not exists sourcing_searches (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  job_posting_id      uuid not null references job_postings(id) on delete cascade,
  requested_by        uuid references profiles(id) on delete set null,
  status              sourcing_status not null default 'queued',
  -- Frozen requirement profile (Phase 1.3). Computed once by the worker's
  -- first stage (so the trigger returns immediately); never recomputed.
  requirement_profile jsonb,
  sources             source_kind[] not null,
  -- per-stage counts (fetched/deduped/gate_passed/scored/verified/shortlisted)
  -- and per-source counts; written incrementally by the worker.
  stats               jsonb not null default '{}'::jsonb,
  input_tokens        int not null default 0,
  output_tokens       int not null default 0,
  cost_usd            numeric(12, 6) not null default 0,
  -- worker pickup count; bounds retries / drives stuck-run recovery.
  attempts            int not null default 0,
  error               text,
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  updated_at          timestamptz not null default now()
);

-- Idempotency: at most one in-flight search per posting. Re-clicking "Find
-- candidates" while one is queued/running fails this unique index -> the
-- trigger maps it to a friendly "already searching" response.
create unique index if not exists uq_sourcing_searches_inflight
  on sourcing_searches (job_posting_id)
  where status in ('queued', 'running');

create index if not exists idx_sourcing_searches_company_created
  on sourcing_searches (company_id, created_at desc);
create index if not exists idx_sourcing_searches_job_created
  on sourcing_searches (job_posting_id, created_at desc);
-- supports both the queued-pickup backstop and the stuck-running reaper.
create index if not exists idx_sourcing_searches_pickup
  on sourcing_searches (status, updated_at)
  where status in ('queued', 'running');

drop trigger if exists trg_sourcing_searches_updated_at on sourcing_searches;
create trigger trg_sourcing_searches_updated_at
  before update on sourcing_searches
  for each row execute function set_updated_at();

-- ===================================================================
-- sourced_candidates — fetched + judged candidates for a search.
-- ===================================================================
create table if not exists sourced_candidates (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references companies(id) on delete cascade,
  sourcing_search_id     uuid not null references sourcing_searches(id) on delete cascade,
  source                 source_kind not null,
  source_ref             text,
  -- deterministic dedup key: normalized name + one strong signal (Phase 1.5).
  identity_key           text not null,
  -- normalized canonical profile WITH provenance (each field tagged to its
  -- source span); the only text the AI is allowed to judge from.
  profile                jsonb not null,
  -- [{ requirement_id, met, evidence, confidence }] — cited per requirement.
  requirement_results    jsonb not null default '[]'::jsonb,
  meets_all_requirements boolean not null default false,
  score                  numeric(5, 2),
  score_breakdown        jsonb,
  rank                   int,
  contact                jsonb,
  verified               boolean not null default false,
  -- set when HR promotes this row to a real candidate; promoted rows are
  -- exempt from the TTL purge.
  promoted_candidate_id  uuid references candidates(id) on delete set null,
  created_at             timestamptz not null default now(),
  expires_at             timestamptz not null default (now() + interval '30 days')
);

-- deterministic dedup is auditable: one human == one row per search.
create unique index if not exists uq_sourced_candidates_identity
  on sourced_candidates (sourcing_search_id, identity_key);
create index if not exists idx_sourced_candidates_rank
  on sourced_candidates (sourcing_search_id, rank);
create index if not exists idx_sourced_candidates_company_created
  on sourced_candidates (company_id, created_at desc);
-- TTL purge only touches unpromoted rows.
create index if not exists idx_sourced_candidates_ttl
  on sourced_candidates (expires_at)
  where promoted_candidate_id is null;

-- ===================================================================
-- RLS — company-scoped reads for members, operator override, service-role
-- writes (the worker + API routes use the admin client). Mirrors
-- notification_deliveries (migration 260).
-- ===================================================================
alter table sourcing_searches enable row level security;

drop policy if exists sourcing_searches_member_read on sourcing_searches;
create policy sourcing_searches_member_read
  on sourcing_searches
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists sourcing_searches_operator_read on sourcing_searches;
create policy sourcing_searches_operator_read
  on sourcing_searches
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on sourcing_searches to authenticated;
grant select, insert, update, delete on sourcing_searches to service_role;

alter table sourced_candidates enable row level security;

drop policy if exists sourced_candidates_member_read on sourced_candidates;
create policy sourced_candidates_member_read
  on sourced_candidates
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists sourced_candidates_operator_read on sourced_candidates;
create policy sourced_candidates_operator_read
  on sourced_candidates
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on sourced_candidates to authenticated;
grant select, insert, update, delete on sourced_candidates to service_role;

-- ===================================================================
-- try_consume_sourcing_quota — atomic check-and-bump (FOR UPDATE row lock).
-- Mirrors try_consume_cv_quota but is units-parameterized and returns a jsonb
-- result so the trigger can surface used/limit/remaining to HR.
-- ===================================================================
create or replace function try_consume_sourcing_quota(p_company_id uuid, p_units int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status subscription_status;
  v_used   int;
  v_limit  int;
  v_trial  timestamptz;
begin
  if p_units is null or p_units < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_units');
  end if;

  select status, sourcing_quota_used, sourcing_quota_limit, trial_ends_at
    into v_status, v_used, v_limit, v_trial
    from subscriptions
   where company_id = p_company_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_subscription');
  end if;

  -- Pro (active): allowed without bumping the trial counter (monthly quota is
  -- a billing-layer concern; mirrors try_consume_cv_quota).
  if v_status = 'active' then
    return jsonb_build_object('ok', true, 'status', 'active',
                              'used', v_used, 'limit', v_limit);
  end if;

  if v_status = 'trialing'
     and v_trial > now()
     and v_used + p_units <= v_limit then
    update subscriptions
       set sourcing_quota_used = sourcing_quota_used + p_units,
           updated_at = now()
     where company_id = p_company_id;
    return jsonb_build_object('ok', true, 'status', 'trialing',
                              'used', v_used + p_units, 'limit', v_limit,
                              'remaining', greatest(v_limit - (v_used + p_units), 0));
  end if;

  return jsonb_build_object(
    'ok', false,
    'error', case
               when v_status = 'trialing' and v_trial <= now() then 'trial_expired'
               else 'sourcing_quota_exceeded'
             end,
    'used', v_used, 'limit', v_limit, 'remaining', greatest(v_limit - v_used, 0));
end; $$;

revoke all on function try_consume_sourcing_quota(uuid, int) from public;
grant execute on function try_consume_sourcing_quota(uuid, int) to service_role;

-- ===================================================================
-- refund_sourcing_quota — give a trial unit back on terminal worker failure
-- (so infra failures don't burn a slot). Idempotent: clamps at 0, trial only.
-- Mirrors refund_cv_quota.
-- ===================================================================
create or replace function refund_sourcing_quota(p_company_id uuid, p_units int default 1)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update subscriptions
     set sourcing_quota_used = greatest(sourcing_quota_used - greatest(coalesce(p_units, 0), 0), 0),
         updated_at = now()
   where company_id = p_company_id
     and status = 'trialing';
end; $$;

revoke all on function refund_sourcing_quota(uuid, int) from public;
grant execute on function refund_sourcing_quota(uuid, int) to service_role;

-- ===================================================================
-- claim_sourcing_search — atomic worker claim. Flips a queued search (or a
-- stale 'running' one whose worker crashed) to 'running', stamps started_at
-- once, and bumps attempts, all in a single conditional UPDATE so concurrent
-- workers (the immediate kick + the pickup cron) can never double-process.
-- Returns the claimed row, or NULL when another worker already owns it.
-- ===================================================================
create or replace function claim_sourcing_search(p_id uuid, p_stale_minutes int default 10)
returns sourcing_searches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row sourcing_searches;
begin
  update sourcing_searches
     set status = 'running',
         started_at = coalesce(started_at, now()),
         attempts = attempts + 1,
         updated_at = now()
   where id = p_id
     and (
       status = 'queued'
       or (status = 'running' and updated_at < now() - make_interval(mins => greatest(p_stale_minutes, 1)))
     )
  returning * into v_row;

  return v_row;
end; $$;

revoke all on function claim_sourcing_search(uuid, int) from public;
grant execute on function claim_sourcing_search(uuid, int) to service_role;

-- ===================================================================
-- purge_expired_sourcing — TTL cleanup. Deletes unpromoted sourced_candidates
-- past expires_at and sourcing_searches older than 90 days. Logs counts.
-- ===================================================================
create or replace function purge_expired_sourcing()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidates int;
  v_searches   int;
begin
  delete from sourced_candidates
   where expires_at < now()
     and promoted_candidate_id is null;
  get diagnostics v_candidates = row_count;

  delete from sourcing_searches
   where created_at < now() - interval '90 days';
  get diagnostics v_searches = row_count;

  raise notice '[sourcing] ttl purge: % sourced_candidates, % sourcing_searches',
    v_candidates, v_searches;
end; $$;

revoke all on function purge_expired_sourcing() from public;
grant execute on function purge_expired_sourcing() to service_role;

-- ===================================================================
-- pg_cron jobs (mirror migrations 021 / 260). All idempotent via the
-- unschedule-in-DO guard. HTTP jobs depend on the app.settings.* GUCs
-- (set out-of-band, see DEPLOYMENT.md).
-- ===================================================================

-- Worker pickup + stuck-run recovery (every 2 min). Re-invokes the Next.js
-- background worker route for queued searches the immediate kick missed, and
-- for searches stuck in 'running' (crashed worker). The worker's atomic claim
-- (claim_sourcing_search) + bounded attempts turn a stale 'running' row into a
-- resume or a loud 'failed' (never a hang). Targets the app via the
-- app.settings.app_url GUC (set out-of-band, see DEPLOYMENT.md); authenticates
-- with the service-role key, which the route verifies.
do $$
begin
  perform cron.unschedule('source-candidates-pickup');
exception when others then
  null;
end $$;

select cron.schedule(
  'source-candidates-pickup',
  '*/2 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.settings.app_url') || '/api/internal/sourcing/run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := jsonb_build_object('searchId', id::text)::text
    )
    from sourcing_searches
    where (status = 'queued'  and created_at < now() - interval '2 minutes')
       or (status = 'running' and updated_at < now() - interval '10 minutes')
    limit 10;
  $$
);

-- TTL purge (nightly 03:45) — after cv-retention (03:15) / trial-expiry (03:30).
do $$
begin
  perform cron.unschedule('purge-expired-sourcing');
exception when others then
  null;
end $$;

select cron.schedule(
  'purge-expired-sourcing',
  '45 3 * * *',
  $$ select purge_expired_sourcing() $$
);
