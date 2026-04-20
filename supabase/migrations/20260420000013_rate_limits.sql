-- 013_rate_limits.sql
-- Unchanged from pre-multi-tenant schema. Keyed by arbitrary string (e.g. "apply:ip:1.2.3.4").

create table rate_limits (
  key          text primary key,
  count        integer not null default 1,
  window_start timestamptz not null default now(),
  expires_at   timestamptz not null
);

create index idx_rate_limits_expires on rate_limits(expires_at);
