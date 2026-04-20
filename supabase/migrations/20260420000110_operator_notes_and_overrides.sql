-- 110_operator_notes_and_overrides.sql
-- PR #4: per-tenant operator notes + subscription quota overrides + soft
-- delete scheduling. All new writes captured in audit_log.

create table operator_company_notes (
  id              bigserial primary key,
  company_id      uuid not null references companies(id) on delete cascade,
  author_user_id  uuid references profiles(id) on delete set null,
  body            text not null check (length(body) between 1 and 8000),
  pinned          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_operator_company_notes_company
  on operator_company_notes(company_id, created_at desc);
create index idx_operator_company_notes_pinned
  on operator_company_notes(company_id, pinned, created_at desc)
  where pinned;

alter table operator_company_notes enable row level security;

-- Only operators (is_operator JWT claim) may read/write.
create policy operator_notes_operator_all on operator_company_notes
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select, insert, update, delete on operator_company_notes to authenticated, service_role;
grant usage, select on sequence operator_company_notes_id_seq to authenticated, service_role;

-- Subscription manual quota overrides. jsonb so future overrides slot in
-- without schema churn. Example: { "cv_quota_limit": 500, "reason": "pilot" }.
alter table subscriptions
  add column if not exists manual_override jsonb;

-- Soft-delete scheduling for tenants (GDPR 30-day grace). A separate column
-- from `status = 'deleted'` so the owner still has a chance to cancel.
alter table companies
  add column if not exists deletion_scheduled_at timestamptz;
