-- Honest applications: store requirement Q&A on every candidate and add a
-- new 'unscored' status for candidates who applied honestly but didn't meet
-- the HR-defined hard requirements. Auto-AI is skipped for them; HR can
-- manually trigger analysis later.
--
-- Note on enum + columns in one file: ALTER TYPE … ADD VALUE may not be
-- *used* in the same transaction it was created in. We do not reference the
-- new value anywhere in this migration (no INSERT/UPDATE), so a single
-- migration is safe.

alter type candidate_status add value if not exists 'unscored';

alter table candidates
  add column if not exists requirements_responses jsonb,
  add column if not exists requirements_snapshot  jsonb,
  add column if not exists meets_requirements     boolean;

comment on column candidates.requirements_responses is
  'Map of requirement_id -> raw answer string the candidate submitted on the apply form.';
comment on column candidates.requirements_snapshot is
  'Frozen copy of job_postings.hard_requirements at submission time. Lets HR see the gap accurately even after the job posting changes.';
comment on column candidates.meets_requirements is
  'true when every requirement in the snapshot was satisfied; false when at least one was missed; null when the job had no hard requirements.';

create index if not exists candidates_meets_requirements_idx
  on candidates (job_posting_id, meets_requirements)
  where meets_requirements is not null;
