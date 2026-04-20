-- 006_subscriptions.sql
-- Per-company trial/Pro state. Trial defaults: 14 days + 50 CV analyses + 3 active jobs.

create table subscriptions (
  company_id      uuid primary key references companies(id) on delete cascade,
  status          subscription_status not null default 'trialing',
  trial_ends_at   timestamptz not null default (now() + interval '14 days'),
  cv_quota_used   int not null default 0,
  cv_quota_limit  int not null default 50,
  job_quota_limit int not null default 3,
  pro_started_at  timestamptz,
  pro_renews_at   timestamptz,
  updated_at      timestamptz not null default now()
);

create index idx_subscriptions_status on subscriptions(status);
create index idx_subscriptions_trial_ends on subscriptions(trial_ends_at) where status = 'trialing';
