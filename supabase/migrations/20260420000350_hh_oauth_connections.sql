-- 350_hh_oauth_connections.sql
-- Durable hh.uz OAuth state for active sourcing.
--
-- Secrets are intentionally NOT stored in these public tables. Tokens live in
-- Supabase Vault, referenced by deterministic secret names. The Next.js service
-- role calls the SECURITY DEFINER helpers below to read/write Vault values.

create extension if not exists supabase_vault;

create or replace function app_secret_read(p_name text)
returns text
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = p_name;

  return v_secret;
end;
$$;

revoke all on function app_secret_read(text) from public;
grant execute on function app_secret_read(text) to service_role;

create or replace function app_secret_upsert(p_name text, p_secret text)
returns void
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  v_id uuid;
begin
  if length(coalesce(p_name, '')) < 3 then
    raise exception 'app_secret_upsert: invalid secret name';
  end if;
  if length(coalesce(p_secret, '')) < 1 then
    raise exception 'app_secret_upsert: empty secret';
  end if;

  select id into v_id
  from vault.secrets
  where name = p_name;

  if v_id is null then
    perform vault.create_secret(p_secret, p_name);
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end;
$$;

revoke all on function app_secret_upsert(text, text) from public;
grant execute on function app_secret_upsert(text, text) to service_role;

create table if not exists company_hh_connections (
  company_id          uuid primary key references companies(id) on delete cascade,
  employer_id         text,
  employer_name       text,
  manager_id          text,
  account_id          text,
  access_secret_name  text,
  refresh_secret_name text not null,
  access_expires_at   timestamptz,
  status              text not null default 'active'
    check (status in ('active', 'needs_reconnect', 'disabled')),
  last_error          text,
  last_error_at       timestamptz,
  connected_by        uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_company_hh_connections_status
  on company_hh_connections (status, updated_at desc);

drop trigger if exists trg_company_hh_connections_updated_at on company_hh_connections;
create trigger trg_company_hh_connections_updated_at
  before update on company_hh_connections
  for each row execute function set_updated_at();

alter table company_hh_connections enable row level security;

drop policy if exists company_hh_connections_member_read on company_hh_connections;
create policy company_hh_connections_member_read
  on company_hh_connections
  for select
  using (company_id in (select user_companies()));

drop policy if exists company_hh_connections_operator_read on company_hh_connections;
create policy company_hh_connections_operator_read
  on company_hh_connections
  for select
  using ((auth.jwt() ->> 'is_operator')::boolean = true);

grant select on company_hh_connections to authenticated;
grant select, insert, update, delete on company_hh_connections to service_role;

create table if not exists platform_hh_connection (
  id                  boolean primary key default true check (id),
  access_secret_name  text,
  refresh_secret_name text,
  access_expires_at   timestamptz,
  status              text not null default 'active'
    check (status in ('active', 'needs_reconnect', 'disabled')),
  last_error          text,
  last_error_at       timestamptz,
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_platform_hh_connection_updated_at on platform_hh_connection;
create trigger trg_platform_hh_connection_updated_at
  before update on platform_hh_connection
  for each row execute function set_updated_at();

alter table platform_hh_connection enable row level security;

drop policy if exists platform_hh_connection_operator_read on platform_hh_connection;
create policy platform_hh_connection_operator_read
  on platform_hh_connection
  for select
  using ((auth.jwt() ->> 'is_operator')::boolean = true);

grant select on platform_hh_connection to authenticated;
grant select, insert, update, delete on platform_hh_connection to service_role;
