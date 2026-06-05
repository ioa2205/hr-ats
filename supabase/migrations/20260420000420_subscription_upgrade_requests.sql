-- 420_subscription_upgrade_requests.sql
-- Manual Pro approval lane for the pre-payment-processor period.
-- HR users request Pro; operators approve/reject from the operator inbox.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_upgrade_request_status') then
    create type subscription_upgrade_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    );
  end if;
end $$;

create table if not exists subscription_upgrade_requests (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  requested_by      uuid not null references profiles(id) on delete cascade,
  plan_id           uuid not null references subscription_plans(id),
  status            subscription_upgrade_request_status not null default 'pending',
  source            text not null default 'billing_settings',
  request_note      text check (request_note is null or length(request_note) <= 2000),
  approver_user_id  uuid references profiles(id) on delete set null,
  operator_note     text check (operator_note is null or length(operator_note) <= 2000),
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists idx_subscription_upgrade_one_pending
  on subscription_upgrade_requests(company_id, plan_id)
  where status = 'pending';

create index if not exists idx_subscription_upgrade_status
  on subscription_upgrade_requests(status, created_at desc);

create index if not exists idx_subscription_upgrade_company
  on subscription_upgrade_requests(company_id, created_at desc);

drop trigger if exists trg_subscription_upgrade_requests_updated_at
  on subscription_upgrade_requests;
create trigger trg_subscription_upgrade_requests_updated_at
  before update on subscription_upgrade_requests
  for each row execute function set_updated_at();

alter table subscription_upgrade_requests enable row level security;

drop policy if exists subscription_upgrade_member_read on subscription_upgrade_requests;
create policy subscription_upgrade_member_read
  on subscription_upgrade_requests
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists subscription_upgrade_admin_insert on subscription_upgrade_requests;
create policy subscription_upgrade_admin_insert
  on subscription_upgrade_requests
  for insert
  to authenticated
  with check (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

drop policy if exists subscription_upgrade_operator_all on subscription_upgrade_requests;
create policy subscription_upgrade_operator_all
  on subscription_upgrade_requests
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select, insert on subscription_upgrade_requests to authenticated;
grant select, insert, update, delete on subscription_upgrade_requests to service_role;
