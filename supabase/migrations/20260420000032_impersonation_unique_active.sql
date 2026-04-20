-- Enforce at-most-one active impersonation session per operator.
--
-- The /api/operator/impersonate/start handler first closes any open sessions
-- for the caller, then inserts a new one. Two concurrent requests can both
-- run the close step, then both succeed on insert, leaving two open sessions.
-- This partial unique index makes the second concurrent insert fail with
-- 23505, which the handler retries once as a close-and-retry.

create unique index if not exists impersonation_one_active_per_operator
  on impersonation_sessions (operator_id)
  where ended_at is null;
