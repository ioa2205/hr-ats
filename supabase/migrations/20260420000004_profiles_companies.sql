-- 004_profiles_companies.sql
-- Tenant root (companies) and per-user profile (1:1 with auth.users).
-- Also seeds the pending_operators allow-list table used for operator auto-elevation.

-- === companies (the tenant) ===
create table companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 2 and 100),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,50}$'),
  logo_url       text,
  default_locale text not null default 'ru' check (default_locale in ('ru', 'uz', 'en')),
  status         text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index idx_companies_status on companies(status);

-- === profiles (1:1 with auth.users) ===
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text not null unique,
  full_name          text not null,
  avatar_url         text,
  phone              text,
  phone_verified_at  timestamptz,
  locale             text not null default 'ru' check (locale in ('ru', 'uz', 'en')),
  current_company_id uuid references companies(id) on delete set null,
  is_operator        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_profiles_current_company on profiles(current_company_id);
create index idx_profiles_is_operator on profiles(is_operator) where is_operator = true;

-- === pending_operators (allow-list for operator auto-elevation) ===
-- Seeded emails here get is_operator=true automatically on profile creation
-- (see auto_elevate_operator trigger in migrations 18/19).
create table pending_operators (
  email      text primary key,
  reason     text,
  added_at   timestamptz not null default now()
);
