-- 012_settings.sql
-- Splits the old single-row app_settings into:
--   company_settings  — per-company overrides (Telegram templates, etc.)
--   platform_settings — operator-controlled defaults; fallback when a company has no override.

create table company_settings (
  company_id uuid not null references companies(id) on delete cascade,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, key)
);

create table platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
