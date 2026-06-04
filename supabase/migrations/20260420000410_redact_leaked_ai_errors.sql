-- 410_redact_leaked_ai_errors.sql
-- Incident remediation. A suspended Google Gemini key returned a 403 whose
-- message embedded the key ("Permission denied: Consumer 'api_key:AIza...' has
-- been suspended."). process-cv stored that raw message in candidates.ai_error
-- (rendered in the HR UI) and in diagnostic columns. The function/worker code
-- now redacts + uses controlled markers; this migration scrubs rows already
-- written and re-queues the affected candidates so they re-analyze cleanly once
-- the key is rotated in the Supabase secret store.
--
-- Idempotent: every statement is guarded by a WHERE that matches only affected
-- rows, so re-running is a no-op.

-- 1. Candidate-facing field. Any leaked/auth error collapses to the safe
--    'ai_unavailable' marker, and the row becomes retryable again WITHOUT
--    burning its retry budget (so the retry cron reprocesses it after the key
--    is fixed). Genuine per-CV failures (no key/auth signature) are untouched.
update candidates
set
  status = case when status = 'analysis_failed' then 'pending_analysis' else status end,
  retry_count = 0,
  ai_error = 'ai_unavailable'
where ai_error is not null
  and ai_error ~* '(AIza[0-9A-Za-z_-]{10,}|api[_ -]?key|permission.?denied|suspended)';

-- 2. Diagnostic columns. Keep the surrounding text, strip the credential value.
update ai_processing_attempts
set error = regexp_replace(
      regexp_replace(error, 'AIza[0-9A-Za-z_-]{10,}', '[redacted-key]', 'g'),
      '(api[_-]?key["'' :=]{1,4})[A-Za-z0-9._-]{8,}', '\1[redacted]', 'g')
where error ~* '(AIza[0-9A-Za-z_-]{10,}|api[_-]?key["'' :=]{1,4}[A-Za-z0-9._-]{8,})';

update sourcing_searches
set error = regexp_replace(
      regexp_replace(error, 'AIza[0-9A-Za-z_-]{10,}', '[redacted-key]', 'g'),
      '(api[_-]?key["'' :=]{1,4})[A-Za-z0-9._-]{8,}', '\1[redacted]', 'g')
where error is not null
  and error ~* '(AIza[0-9A-Za-z_-]{10,}|api[_-]?key["'' :=]{1,4}[A-Za-z0-9._-]{8,})';

update worker_heartbeats
set last_error = regexp_replace(
      regexp_replace(last_error, 'AIza[0-9A-Za-z_-]{10,}', '[redacted-key]', 'g'),
      '(api[_-]?key["'' :=]{1,4})[A-Za-z0-9._-]{8,}', '\1[redacted]', 'g')
where last_error is not null
  and last_error ~* '(AIza[0-9A-Za-z_-]{10,}|api[_-]?key["'' :=]{1,4}[A-Za-z0-9._-]{8,})';
