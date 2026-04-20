-- 014_impersonation.sql
-- Audit trail for operator impersonation sessions. Every action performed during
-- an active session is correlated in audit_log via both actor_user_id (target)
-- and the session's operator_id (impersonator).

create table impersonation_sessions (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references profiles(id) on delete cascade,
  target_user_id uuid not null references profiles(id) on delete cascade,
  reason         text not null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create index idx_impersonation_operator on impersonation_sessions(operator_id, started_at desc);
create index idx_impersonation_target on impersonation_sessions(target_user_id, started_at desc);
create index idx_impersonation_active on impersonation_sessions(operator_id) where ended_at is null;
