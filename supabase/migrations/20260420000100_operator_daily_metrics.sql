-- 100_operator_daily_metrics.sql
-- Time-series rollup powering the operator dashboard (PR #2, §4.2).
-- Refreshed every 15 minutes by /api/operator/cron/refresh-metrics — keep the
-- compute cheap; this MV scans ai_processing_attempts, audit_log and
-- candidates for the last 90 days every tick.

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
  -- Distinct actor IDs with any audit activity. Proxy for DAU until we wire
  -- a proper session-start event.
  select
    (created_at at time zone 'UTC')::date as day,
    count(distinct actor_user_id)::bigint as n
  from audit_log
  where created_at >= (now() - interval '90 days')
    and actor_user_id is not null
  group by 1
),
daily_ai_cost as (
  select
    (created_at at time zone 'UTC')::date as day,
    coalesce(sum(cost_usd), 0)::numeric(12, 6) as cost,
    count(*)::bigint as attempts,
    count(*) filter (where status <> 'success')::bigint as failures
  from ai_processing_attempts
  where created_at >= (now() - interval '90 days')
  group by 1
),
daily_active_companies as (
  -- Snapshot: companies created on or before this day, status != deleted.
  -- Cheaper than window joins per-day since companies is small.
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
  coalesce(ac.n, 0)      as active_companies,
  coalesce(dc.n, 0)      as candidates_processed,
  coalesce(dau.n, 0)     as daily_active_users,
  coalesce(cost.cost, 0) as ai_cost_usd,
  coalesce(cost.attempts, 0) as ai_attempts,
  coalesce(cost.failures, 0) as ai_failures
from days d
left join daily_active_companies ac on ac.day = d.day
left join daily_candidates       dc on dc.day = d.day
left join daily_active_users     dau on dau.day = d.day
left join daily_ai_cost          cost on cost.day = d.day;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY — no read locks during
-- refresh, so the dashboard stays responsive while the cron fires.
create unique index idx_operator_daily_metrics_day on operator_daily_metrics(day);

-- =============================================================
-- Company health score (explainable, rule-based per §4.3 spec).
-- Scores on [0, 100]; lower = at-risk. Exposed as a plain view so
-- operator queries can filter/sort without recomputing in TS.
-- =============================================================
create or replace view company_health as
with sub as (
  -- `past_due` is the health-score concept (billing is unhealthy). The real
  -- enum is ('trialing','active','expired','cancelled') — we treat expired
  -- and cancelled as unhealthy since there is no separate past-due state.
  select company_id,
         bool_or(status in ('expired', 'cancelled'))   as any_past_due,
         bool_or(status in ('active', 'trialing'))     as has_live_sub
  from subscriptions
  group by company_id
),
jobs as (
  select company_id,
         count(*) filter (where status = 'active' and created_at > now() - interval '30 days') as active_recent,
         count(*) filter (where status = 'active') as active_total
  from job_postings
  group by company_id
),
members as (
  select company_id, count(*) as n
  from company_members
  group by company_id
),
cand as (
  select j.company_id, count(c.id) as n_30d
  from candidates c
  join job_postings j on j.id = c.job_posting_id
  where c.created_at > now() - interval '30 days'
  group by j.company_id
),
logins as (
  -- Last login is approximated by latest audit_log entry authored by any
  -- member of the company. Cheap and good enough for triage.
  select cm.company_id, max(al.created_at) as last_at
  from company_members cm
  left join audit_log al
    on al.actor_user_id = cm.user_id
   and al.created_at > now() - interval '14 days'
  group by cm.company_id
)
select
  co.id as company_id,
  co.name,
  co.status as company_status,
  coalesce(s.any_past_due, false) as past_due,
  coalesce(j.active_total, 0)     as active_jobs,
  coalesce(m.n, 0)                as member_count,
  coalesce(c.n_30d, 0)            as candidates_30d,
  l.last_at                       as last_login_at,
  greatest(
    0,
    least(
      100,
      100
      - (case when coalesce(s.any_past_due, false) then 30 else 0 end)
      - (case when coalesce(j.active_recent, 0) = 0 then 20 else 0 end)
      - (case when l.last_at is null then 15 else 0 end)
      - (case when coalesce(m.n, 1) <= 1 then 10 else 0 end)
      + (case when coalesce(c.n_30d, 0) > 50 then 10 else 0 end)
      + (case when coalesce(j.active_total, 0) >= 3 then 10 else 0 end)
    )
  )::int as score
from companies co
left join sub     s on s.company_id = co.id
left join jobs    j on j.company_id = co.id
left join members m on m.company_id = co.id
left join cand    c on c.company_id = co.id
left join logins  l on l.company_id = co.id
where co.status <> 'deleted';

grant select on operator_daily_metrics to service_role;
grant select on company_health to service_role;

-- Pure-SQL RPC called by /api/operator/cron/refresh-metrics. Concurrent
-- refresh requires the unique index defined above and avoids read locks.
create or replace function refresh_operator_daily_metrics()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently operator_daily_metrics
$$;

grant execute on function refresh_operator_daily_metrics() to service_role;

-- Seed the MV so the first dashboard render has data.
refresh materialized view operator_daily_metrics;
