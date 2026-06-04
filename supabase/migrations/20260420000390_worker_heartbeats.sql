-- 390_worker_heartbeats.sql
-- Observability for background workers. The sourcing-run, telegram-ingest and
-- notification-retry worker routes record a heartbeat on every run, so the
-- operator dashboard can show freshness + last error instead of failures being
-- invisible until a user complains. Operator-read, service-role write.

create table if not exists worker_heartbeats (
  worker               text primary key,
  last_run_at          timestamptz,
  last_success_at      timestamptz,
  last_error           text,
  last_error_at        timestamptz,
  consecutive_failures integer not null default 0,
  updated_at           timestamptz not null default now()
);

alter table worker_heartbeats enable row level security;

drop policy if exists wh_operator_read on worker_heartbeats;
create policy wh_operator_read
  on worker_heartbeats
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on worker_heartbeats to authenticated;
grant select, insert, update on worker_heartbeats to service_role;

-- Atomic upsert + failure-streak counter. service_role calls it from the worker
-- routes; a successful run clears the streak, a failure increments it.
create or replace function record_worker_heartbeat(
  p_worker text,
  p_ok boolean,
  p_error text default null
)
returns void
language plpgsql
as $$
begin
  insert into worker_heartbeats (
    worker, last_run_at, last_success_at, last_error, last_error_at,
    consecutive_failures, updated_at
  )
  values (
    p_worker,
    now(),
    case when p_ok then now() else null end,
    case when p_ok then null else p_error end,
    case when p_ok then null else now() end,
    case when p_ok then 0 else 1 end,
    now()
  )
  on conflict (worker) do update set
    last_run_at = now(),
    last_success_at = case when p_ok then now() else worker_heartbeats.last_success_at end,
    last_error = case when p_ok then null else p_error end,
    last_error_at = case when p_ok then worker_heartbeats.last_error_at else now() end,
    consecutive_failures =
      case when p_ok then 0 else worker_heartbeats.consecutive_failures + 1 end,
    updated_at = now();
end;
$$;

revoke all on function record_worker_heartbeat(text, boolean, text) from public;
grant execute on function record_worker_heartbeat(text, boolean, text) to service_role;
