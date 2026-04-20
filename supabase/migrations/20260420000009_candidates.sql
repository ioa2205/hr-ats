-- 009_candidates.sql
-- Structurally unchanged from pre-multi-tenant schema. Tenant inherited via job_posting_id.
-- (Plan.md §5: "We don't denormalize company_id; it's joined when needed.")

create table candidates (
  id                uuid primary key default gen_random_uuid(),
  job_posting_id    uuid not null references job_postings(id) on delete cascade,
  full_name         text not null,
  phone_number      text not null check (phone_number ~ '^\+998\d{9}$'),
  cv_storage_path   text,
  status            candidate_status not null default 'pending_analysis',
  match_score       smallint check (match_score between 0 and 100),
  one_line_summary  text,
  strengths         text[],
  gaps              text[],
  language_detected detected_language,
  ai_error          text,
  retry_count       smallint not null default 0 check (retry_count <= 5),
  hr_notes          text,
  invited_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_candidates_job_posting_id on candidates(job_posting_id);
create index idx_candidates_status on candidates(status);
create index idx_candidates_match_score on candidates(match_score desc nulls last);
create index idx_candidates_created_at on candidates(created_at desc);
create index idx_candidates_full_name_trgm
  on candidates using gin (full_name gin_trgm_ops);
