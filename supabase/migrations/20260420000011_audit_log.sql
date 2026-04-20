-- 011_audit_log.sql
-- Tenant-scoped when possible; company_id is nullable for operator/system-level events.

create table audit_log (
  id            bigserial primary key,
  company_id    uuid references companies(id) on delete set null,
  actor         text not null,
  actor_user_id uuid references profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index idx_audit_log_created_at on audit_log(created_at desc);
create index idx_audit_log_company on audit_log(company_id, created_at desc);
create index idx_audit_log_actor_user on audit_log(actor_user_id, created_at desc);
