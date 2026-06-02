-- 330_cron_vault_secrets.sql
-- Move the cron HTTP jobs off the `app.settings.*` custom GUCs and onto
-- Supabase Vault.
--
-- Why: hosted Supabase runs every SQL-editor / migration session as the
-- non-superuser `postgres` role, which does NOT own the `postgres` database.
-- Persisting a custom "placeholder" GUC (`alter database`/`alter role ... set
-- app.settings.*`) requires superuser, so it fails with
--   ERROR 42501: permission denied to set parameter "app.settings.supabase_url"
-- That means `current_setting('app.settings.*')` can never be populated on a
-- hosted project, and any cron that reads it errors every run. Vault is the
-- supported secret store, is readable by `postgres` (which pg_cron jobs run
-- as), and needs no superuser. This migration repoints all three HTTP crons
-- (process-cv retry, notification retry, sourcing pickup) to Vault.
--
-- ONE-TIME manual setup (carries the real secrets, so intentionally NOT in
-- this committed file — run once in the SQL editor / via psql):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'supabase_url');
--   select vault.create_secret('<service_role_key>',                'service_role_key');
--   select vault.create_secret('https://<app-host>',                'app_url');
-- To rotate a value later (create_secret errors if the name already exists):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'service_role_key'),
--     '<new value>');

create extension if not exists supabase_vault;

-- ===================================================================
-- Centralised secret reader. SECURITY DEFINER so the function owner's
-- (postgres) Vault access is used; raises a clear error if a secret is
-- missing so a forgotten create_secret fails LOUD, never silently.
-- ===================================================================
create or replace function app_cron_secret(p_name text)
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

  if v_secret is null then
    raise exception
      'app_cron_secret: Vault secret "%" is not set — run vault.create_secret(...) (see migration 330 header)',
      p_name;
  end if;

  return v_secret;
end;
$$;

revoke all on function app_cron_secret(text) from public;

-- ===================================================================
-- retry-pending-cvs (mirrors 021) — now reads supabase_url +
-- service_role_key from Vault instead of app.settings.*.
-- ===================================================================
do $$
begin
  perform cron.unschedule('retry-pending-cvs');
exception when others then
  null;
end $$;

select cron.schedule(
  'retry-pending-cvs',
  '*/2 * * * *',
  $$
    select net.http_post(
      url     := app_cron_secret('supabase_url') || '/functions/v1/process-cv',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || app_cron_secret('service_role_key')
      ),
      body    := jsonb_build_object('candidateId', id::text)::text
    )
    from candidates
    where status = 'pending_analysis'
      and retry_count < 3
      and updated_at < now() - interval '2 minutes'
    limit 20;
  $$
);

-- ===================================================================
-- dispatch-notification-retries (mirrors 260) — Vault-backed.
-- ===================================================================
do $$
begin
  perform cron.unschedule('dispatch-notification-retries');
exception when others then
  null;
end $$;

select cron.schedule(
  'dispatch-notification-retries',
  '* * * * *',
  $$
    select net.http_post(
      url     := app_cron_secret('supabase_url') || '/functions/v1/dispatch-notification-retries',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || app_cron_secret('service_role_key')
      ),
      body    := '{}'::jsonb::text
    );
  $$
);

-- ===================================================================
-- source-candidates-pickup (mirrors 310) — Vault-backed. Re-invokes the
-- Next.js worker route for queued/stuck searches the immediate kick missed.
-- ===================================================================
do $$
begin
  perform cron.unschedule('source-candidates-pickup');
exception when others then
  null;
end $$;

select cron.schedule(
  'source-candidates-pickup',
  '*/2 * * * *',
  $$
    select net.http_post(
      url     := app_cron_secret('app_url') || '/api/internal/sourcing/run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || app_cron_secret('service_role_key')
      ),
      body    := jsonb_build_object('searchId', id::text)::text
    )
    from sourcing_searches
    where (status = 'queued'  and created_at < now() - interval '2 minutes')
       or (status = 'running' and updated_at < now() - interval '10 minutes')
    limit 10;
  $$
);
