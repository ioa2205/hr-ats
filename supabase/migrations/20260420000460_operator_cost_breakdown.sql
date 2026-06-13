-- 460_operator_cost_breakdown.sql
-- Operator cost visibility: split AI spend into CV-screening vs active-sourcing.
--
-- Until now the operator surfaces only counted CV-screening cost
-- (ai_processing_attempts). The active-sourcing funnel also burns Gemini tokens
-- (sourcing_searches.cost_usd) and that spend was invisible platform-wide. This
-- migration teaches both operator rollups about sourcing cost and exposes the
-- breakdown, so "AI cost" everywhere in the operator panel now means
-- screening + sourcing.
--
-- It also fixes two latent issues in company_usage_30d:
--   1. ai_cost_usd_30d was summed across a candidates x ai_attempts cartesian
--      join, inflating the figure by roughly the candidate count. Pre-aggregated
--      CTEs (one row per company per source) make every total exact.
--   2. active_job_count never existed on the view, so the operator company-detail
--      "Active jobs" card always rendered 0. It is added here.
--
-- HR never sees these figures — both MVs are service-role-only (grants below
-- mirror migration 280) and the HR sourcing UI shows no cost at all.

-- ===================================================================
-- company_usage_30d — per-company 30-day rollup (operator company detail).
-- Recreated (MV columns can't be ALTERed in place). Same name + unique index
-- so the hourly `refresh ... concurrently company_usage_30d` cron (migration
-- 021) keeps working untouched.
-- ===================================================================
drop materialized view if exists company_usage_30d;

create materialized view company_usage_30d as
with cv_cost as (
  -- CV screening spend (per-applicant Gemini analysis).
  select company_id, coalesce(sum(cost_usd), 0)::numeric(12, 6) as cost
  from ai_processing_attempts
  where created_at > now() - interval '30 days'
  group by company_id
),
sourcing_cost as (
  -- Active-sourcing funnel spend (outbound search runs).
  select company_id, coalesce(sum(cost_usd), 0)::numeric(12, 6) as cost
  from sourcing_searches
  where created_at > now() - interval '30 days'
  group by company_id
),
cand as (
  select j.company_id, count(distinct c.id) as n
  from candidates c
  join job_postings j on j.id = c.job_posting_id
  where c.created_at > now() - interval '30 days'
  group by j.company_id
),
active_jobs as (
  select company_id, count(*) as n
  from job_postings
  where status = 'active'
  group by company_id
)
select
  co.id   as company_id,
  co.name as name,
  coalesce(cv.cost, 0)::numeric(12, 6)                            as cv_cost_usd_30d,
  coalesce(src.cost, 0)::numeric(12, 6)                           as sourcing_cost_usd_30d,
  -- Total AI spend = screening + sourcing. Kept under the original column name
  -- so existing readers automatically pick up the full figure.
  (coalesce(cv.cost, 0) + coalesce(src.cost, 0))::numeric(12, 6)  as ai_cost_usd_30d,
  coalesce(cand.n, 0)                                             as candidate_count_30d,
  coalesce(aj.n, 0)                                               as active_job_count,
  coalesce(
    (select sum((so.metadata ->> 'size')::bigint)
       from storage.objects so
       where so.bucket_id = 'cvs'
         and (storage.foldername(so.name))[1]::uuid = co.id),
    0
  )::bigint as storage_bytes
from companies co
left join cv_cost       cv  on cv.company_id  = co.id
left join sourcing_cost src on src.company_id = co.id
left join cand          cand on cand.company_id = co.id
left join active_jobs   aj  on aj.company_id  = co.id;

create unique index idx_company_usage_30d_pk on company_usage_30d(company_id);

-- Tenant isolation (mirror migration 280): low-trust roles never read the MV;
-- all consumers go through the service-role admin client.
revoke select on company_usage_30d from anon, authenticated;
grant select on company_usage_30d to service_role;

-- ===================================================================
-- operator_daily_metrics — time-series rollup (operator dashboard).
-- Recreated to add the cv/sourcing cost split; ai_cost_usd is now the total.
-- Same name + unique index so refresh_operator_daily_metrics() (migration 100)
-- keeps working untouched.
-- ===================================================================
drop materialized view if exists operator_daily_metrics;

create materialized view operator_daily_metrics as
with days as (
  select generate_series(
    (now() - interval '89 days')::date,
    now()::date,
    interval '1 day'
  )::date as day
),
daily_candidates as (
  select
    (created_at at time zone 'UTC')::date as day,
    count(*)::bigint as n
  from candidates
  where created_at >= (now() - interval '90 days')
  group by 1
),
daily_active_users as (
  select
    (created_at at time zone 'UTC')::date as day,
    count(distinct actor_user_id)::bigint as n
  from audit_log
  where created_at >= (now() - interval '90 days')
    and actor_user_id is not null
  group by 1
),
daily_cv_cost as (
  select
    (created_at at time zone 'UTC')::date as day,
    coalesce(sum(cost_usd), 0)::numeric(12, 6) as cost,
    count(*)::bigint as attempts,
    count(*) filter (where status <> 'success')::bigint as failures
  from ai_processing_attempts
  where created_at >= (now() - interval '90 days')
  group by 1
),
daily_sourcing_cost as (
  select
    (created_at at time zone 'UTC')::date as day,
    coalesce(sum(cost_usd), 0)::numeric(12, 6) as cost
  from sourcing_searches
  where created_at >= (now() - interval '90 days')
  group by 1
),
daily_active_companies as (
  select
    d.day,
    (select count(*)::bigint
       from companies co
       where co.created_at::date <= d.day
         and co.status <> 'deleted') as n
  from days d
)
select
  d.day,
  coalesce(ac.n, 0)        as active_companies,
  coalesce(dc.n, 0)        as candidates_processed,
  coalesce(dau.n, 0)       as daily_active_users,
  -- Cost split: screening (cv) + sourcing, plus the combined total under the
  -- original ai_cost_usd name so the dashboard burn/timeseries reflect all AI spend.
  coalesce(cv.cost, 0)     as cv_cost_usd,
  coalesce(src.cost, 0)    as sourcing_cost_usd,
  (coalesce(cv.cost, 0) + coalesce(src.cost, 0))::numeric(12, 6) as ai_cost_usd,
  -- Attempts/failures track CV screening only (sourcing runs are not "attempts").
  coalesce(cv.attempts, 0) as ai_attempts,
  coalesce(cv.failures, 0) as ai_failures
from days d
left join daily_active_companies ac  on ac.day = d.day
left join daily_candidates       dc  on dc.day = d.day
left join daily_active_users     dau on dau.day = d.day
left join daily_cv_cost          cv  on cv.day = d.day
left join daily_sourcing_cost    src on src.day = d.day;

create unique index idx_operator_daily_metrics_day on operator_daily_metrics(day);

revoke select on operator_daily_metrics from anon, authenticated;
grant select on operator_daily_metrics to service_role;
