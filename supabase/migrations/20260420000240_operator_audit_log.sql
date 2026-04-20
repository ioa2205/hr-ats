-- 240_operator_audit_log.sql
-- P1-14: dedicated audit trail for operator actions (impersonation, suspend,
-- template edits, grant-operator, approve-promotion).
--
-- Separate from the company-scoped audit_log: that table mixes HR actor events
-- with operator-system events via nullable company_id, which complicates
-- compliance review. This table is operator-only, immutable (only inserts
-- allowed — UPDATE/DELETE raise), and includes the request IP + user-agent
-- for every write.

create table if not exists operator_audit_log (
  id                bigserial primary key,
  actor_user_id     uuid not null references profiles(id) on delete set null,
  action            text not null,
  target_company_id uuid references companies(id) on delete set null,
  target_user_id    uuid references profiles(id) on delete set null,
  metadata          jsonb not null default '{}'::jsonb,
  ip                inet,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_oal_created_at
  on operator_audit_log(created_at desc);
create index if not exists idx_oal_actor
  on operator_audit_log(actor_user_id, created_at desc);
create index if not exists idx_oal_target_company
  on operator_audit_log(target_company_id, created_at desc)
  where target_company_id is not null;
create index if not exists idx_oal_action
  on operator_audit_log(action, created_at desc);

alter table operator_audit_log enable row level security;

drop policy if exists operator_audit_log_select on operator_audit_log;
create policy operator_audit_log_select
  on operator_audit_log
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

-- Writes only via service_role (server-side helper). No insert policy for
-- authenticated: operators cannot forge entries via RLS-bypassing clients.
-- Immutability enforced by trigger below.

create or replace function prevent_operator_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'operator_audit_log is append-only; % is not permitted', tg_op
    using errcode = '42809';
end;
$$;

drop trigger if exists trg_operator_audit_immutable_update on operator_audit_log;
create trigger trg_operator_audit_immutable_update
  before update on operator_audit_log
  for each row execute function prevent_operator_audit_mutation();

drop trigger if exists trg_operator_audit_immutable_delete on operator_audit_log;
create trigger trg_operator_audit_immutable_delete
  before delete on operator_audit_log
  for each row execute function prevent_operator_audit_mutation();

grant select on operator_audit_log to authenticated;
grant insert on operator_audit_log to service_role;
grant usage, select on sequence operator_audit_log_id_seq to service_role;
