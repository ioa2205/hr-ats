-- 017_views.sql
-- Derived projections used by the HR portal and operator panel.

-- Per-job aggregate counts, scoped to the job's company.
create or replace view job_postings_with_counts as
select
  j.id,
  j.company_id,
  j.title,
  j.description,
  j.required_skills,
  j.hard_requirements,
  j.status,
  j.public_token,
  j.created_by,
  j.created_at,
  j.updated_at,
  count(c.id) filter (where c.status = 'analyzed')           as qualified_count,
  count(c.id) filter (where c.status = 'rejected_screening') as screened_out_count,
  count(c.id) filter (where c.status = 'analysis_failed')    as failed_count,
  count(c.id) filter (where c.status = 'invited')            as invited_count,
  count(c.id)                                                as total_count
from job_postings j
left join candidates c on c.job_posting_id = j.id
group by j.id;

-- Candidate ranking view with a stable status ordering for display.
create or replace view candidates_ranked as
select
  c.*,
  case c.status
    when 'analyzed'           then 1
    when 'invited'            then 2
    when 'pending_analysis'   then 3
    when 'analyzing'          then 4
    when 'analysis_failed'    then 5
    when 'rejected_screening' then 6
    when 'rejected'           then 7
  end as status_rank
from candidates c;

-- Storage total (single-row, refreshed hourly via pg_cron in 021).
create materialized view storage_usage as
select
  coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint as total_bytes,
  count(*)::bigint                                         as file_count
from storage.objects
where bucket_id = 'cvs';

-- Per-company 30-day rollup for the operator dashboard.
create materialized view company_usage_30d as
select
  co.id as company_id,
  co.name,
  coalesce(sum(a.cost_usd), 0)::numeric(12, 6) as ai_cost_usd_30d,
  count(distinct c.id)                         as candidate_count_30d,
  coalesce(
    (select sum((so.metadata ->> 'size')::bigint)
       from storage.objects so
       where so.bucket_id = 'cvs'
         and (storage.foldername(so.name))[1]::uuid = co.id),
    0
  )::bigint as storage_bytes
from companies co
left join job_postings j
       on j.company_id = co.id
left join candidates c
       on c.job_posting_id = j.id
      and c.created_at > now() - interval '30 days'
left join ai_processing_attempts a
       on a.company_id = co.id
      and a.created_at > now() - interval '30 days'
group by co.id, co.name;

create unique index idx_company_usage_30d_pk on company_usage_30d(company_id);
