-- 010_ai_attempts.sql
-- AI processing audit + cost tracking. company_id is set for per-tenant
-- attribution in the operator panel and for quota accounting.

create table ai_processing_attempts (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references candidates(id) on delete cascade,
  company_id     uuid references companies(id) on delete cascade,
  status         ai_attempt_status not null,
  model          text not null,
  prompt_tokens  integer,
  output_tokens  integer,
  duration_ms    integer,
  cost_usd       numeric(10, 6),
  error          text,
  created_at     timestamptz not null default now()
);

create index idx_ai_attempts_candidate on ai_processing_attempts(candidate_id);
create index idx_ai_attempts_created_at on ai_processing_attempts(created_at desc);
create index idx_ai_attempts_company on ai_processing_attempts(company_id);
