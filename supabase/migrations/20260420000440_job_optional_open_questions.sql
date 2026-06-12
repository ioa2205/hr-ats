-- 440_job_optional_open_questions.sql
-- Adds two new question groups to a job posting, alongside the existing
-- (blocking) hard_requirements:
--   • optional_questions — yes/no or number questions that are recorded and
--     inform AI scoring but NEVER block the candidate (mirrors the
--     hard_requirement shape).
--   • open_questions — free-text prompts the applicant answers in prose; the
--     answer is fed to AI screening as self-reported context.
-- Applicant answers to both groups are stored on the candidate.

alter table job_postings
  add column if not exists optional_questions jsonb not null default '[]'::jsonb;
alter table job_postings
  add column if not exists open_questions jsonb not null default '[]'::jsonb;

-- Applicant answers: { question_id -> raw answer string }. Nullable: only set
-- when the job actually had questions of that kind.
alter table candidates
  add column if not exists optional_responses jsonb;
alter table candidates
  add column if not exists open_responses jsonb;
