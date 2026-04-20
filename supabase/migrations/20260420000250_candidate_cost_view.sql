-- 250_candidate_cost_view.sql
-- P2-15: convenience view exposing the latest AI cost per candidate.
-- Per-analysis token counts + USD cost already persist on
-- ai_processing_attempts (migration 010). This view returns the most-
-- recent successful attempt per candidate for use in the operator
-- company-detail page's "recent analyses" table.

-- candidates has no direct company_id column; tenancy is inherited via
-- job_postings (see migration 009). Join through job_postings to expose it.
create or replace view candidate_latest_ai_cost as
select
  c.id                      as candidate_id,
  j.company_id              as company_id,
  a.id                      as attempt_id,
  a.status                  as attempt_status,
  a.model                   as model,
  a.prompt_tokens           as prompt_tokens,
  a.output_tokens           as output_tokens,
  a.duration_ms             as duration_ms,
  a.cost_usd                as cost_usd,
  a.created_at              as analyzed_at
from candidates c
join job_postings j on j.id = c.job_posting_id
left join lateral (
  select *
    from ai_processing_attempts
   where candidate_id = c.id
   order by created_at desc
   limit 1
) a on true;

comment on view candidate_latest_ai_cost is
  'Most recent ai_processing_attempts row per candidate. Joined by operator UI for the per-CV cost breakdown. Read via service role; no RLS (relies on admin client).';

grant select on candidate_latest_ai_cost to service_role;
