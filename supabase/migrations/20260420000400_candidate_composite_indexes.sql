-- 400_candidate_composite_indexes.sql
-- Back the hottest candidate access patterns with composite indexes. The job
-- detail page runs several per-status counts scoped to one job, and the
-- applicants + cross-job candidate lists order by match_score within a job.
-- The existing single-column indexes (job_posting_id / status / match_score)
-- force a scan-then-filter; these composites make those queries index-driven.

-- Per-job status counts (job detail funnel tiles, applicant chips).
create index if not exists idx_candidates_job_status
  on candidates (job_posting_id, status);

-- Per-job ranking (applicants list + cross-job candidates list order by score).
create index if not exists idx_candidates_job_match
  on candidates (job_posting_id, match_score desc nulls last);
