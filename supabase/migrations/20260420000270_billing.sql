-- 270_billing.sql
-- P0-2a: Click billing scaffolding. Schema is plan-flexible (billing_unit
-- enum) so we can iterate pricing without a migration churn. Seed row
-- 'pro_monthly_flat' matches the landing page (1,500,000 UZS / month).

-- ===================================================================
-- Enums
-- ===================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_unit') then
    create type billing_unit as enum ('flat', 'per_seat', 'per_cv');
  end if;
  if not exists (select 1 from pg_type where typname = 'billing_interval') then
    create type billing_interval as enum ('month', 'year');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('pending', 'paid', 'failed', 'refunded', 'past_due');
  end if;
end $$;

-- ===================================================================
-- subscription_plans — catalog of pricing rows.
-- ===================================================================
create table if not exists subscription_plans (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique,
  name_en                  text not null,
  name_ru                  text not null,
  name_uz                  text not null,
  price_uzs                numeric(12, 2) not null,
  unit                     billing_unit not null default 'flat',
  interval                 billing_interval not null default 'month',
  cv_quota_monthly         integer,
  interview_quota_monthly  integer,
  seats_included           integer,
  active                   boolean not null default true,
  created_at               timestamptz not null default now()
);

create index if not exists idx_subscription_plans_active
  on subscription_plans(active) where active = true;

insert into subscription_plans (code, name_en, name_ru, name_uz, price_uzs, unit, interval, cv_quota_monthly, interview_quota_monthly, seats_included)
values (
  'pro_monthly_flat',
  'Pro (monthly)',
  'Pro (месячный)',
  'Pro (oylik)',
  1500000.00,
  'flat',
  'month',
  500,
  100,
  null
)
on conflict (code) do nothing;

-- ===================================================================
-- Extend subscriptions with plan reference + lifecycle columns.
-- ===================================================================
alter table subscriptions
  add column if not exists plan_id uuid references subscription_plans(id),
  add column if not exists current_period_end timestamptz,
  add column if not exists grace_period_ends_at timestamptz;

create index if not exists idx_subscriptions_period_end
  on subscriptions(current_period_end) where status = 'active';

-- ===================================================================
-- subscription_invoices — one row per Click transaction attempt.
-- ===================================================================
create table if not exists subscription_invoices (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references companies(id) on delete cascade,
  plan_id                  uuid not null references subscription_plans(id),
  amount_uzs               numeric(12, 2) not null,
  status                   invoice_status not null default 'pending',
  click_transaction_id     text unique,
  click_merchant_prepare_id text unique,
  period_start             timestamptz,
  period_end               timestamptz,
  paid_at                  timestamptz,
  failure_reason           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_invoices_company
  on subscription_invoices(company_id, created_at desc);
create index if not exists idx_invoices_status
  on subscription_invoices(status, created_at desc);

drop trigger if exists trg_subscription_invoices_updated_at on subscription_invoices;
create trigger trg_subscription_invoices_updated_at
  before update on subscription_invoices
  for each row execute function set_updated_at();

alter table subscription_invoices enable row level security;

drop policy if exists si_member_read on subscription_invoices;
create policy si_member_read
  on subscription_invoices
  for select
  to authenticated
  using (company_id in (select user_companies()));

drop policy if exists si_operator_all on subscription_invoices;
create policy si_operator_all
  on subscription_invoices
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select on subscription_invoices to authenticated;
grant select, insert, update on subscription_invoices to service_role;
grant select on subscription_plans to authenticated, service_role;
