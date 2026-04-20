-- 210_idempotency_guard.sql
-- Forward-compat idempotency guard. Re-declares triggers and policies from
-- migrations 019 and 020 with explicit DROP ... IF EXISTS guards, so that any
-- future replay / partial re-apply of these DDL objects is safe. The original
-- migrations are left untouched per the pre-GA hardening rule "don't edit
-- applied migrations." All NEW migrations introduced from this point forward
-- MUST use: `create table if not exists`, `create index if not exists`,
-- `drop trigger if exists ... then create trigger`, and `drop policy if
-- exists ... then create policy`.

-- ===================================================================
-- Triggers (re-declared idempotently)
-- ===================================================================

drop trigger if exists trg_companies_updated_at on companies;
create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

drop trigger if exists trg_job_postings_updated_at on job_postings;
create trigger trg_job_postings_updated_at
  before update on job_postings
  for each row execute function set_updated_at();

drop trigger if exists trg_candidates_updated_at on candidates;
create trigger trg_candidates_updated_at
  before update on candidates
  for each row execute function set_updated_at();

drop trigger if exists trg_company_settings_updated_at on company_settings;
create trigger trg_company_settings_updated_at
  before update on company_settings
  for each row execute function set_updated_at();

drop trigger if exists trg_platform_settings_updated_at on platform_settings;
create trigger trg_platform_settings_updated_at
  before update on platform_settings
  for each row execute function set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

drop trigger if exists trg_profiles_auto_elevate on profiles;
create trigger trg_profiles_auto_elevate
  after insert on profiles
  for each row execute function auto_elevate_operator();

drop trigger if exists trg_profiles_sync_operator_claim on profiles;
create trigger trg_profiles_sync_operator_claim
  after insert or update of is_operator on profiles
  for each row execute function sync_operator_jwt_claim();

-- ===================================================================
-- Policies: re-assert the ones most likely to drift during partial replays.
-- We guard the tenant-critical policies; storage policies in 020 already use
-- `drop policy if exists` guards, and the rest are safe as long as the full
-- migration sequence runs from a clean state.
-- ===================================================================

do $guard$
declare
  pol record;
  tenant_policies text[] := array[
    'profiles:profiles_self_read',
    'profiles:profiles_self_update',
    'profiles:profiles_operator_read',
    'companies:companies_member_read',
    'companies:companies_admin_update',
    'companies:companies_operator_read',
    'companies:companies_operator_update',
    'company_members:company_members_member_read',
    'company_members:company_members_self_read',
    'company_members:company_members_admin_insert',
    'company_members:company_members_admin_update',
    'company_members:company_members_admin_delete',
    'company_members:company_members_operator_read',
    'subscriptions:subscriptions_member_read',
    'subscriptions:subscriptions_owner_update',
    'subscriptions:subscriptions_operator_all',
    'job_postings:jobs_member_all',
    'job_postings:jobs_public_token_read',
    'job_postings:jobs_operator_read',
    'candidates:candidates_member_read',
    'candidates:candidates_member_update',
    'candidates:candidates_member_delete',
    'candidates:candidates_operator_read',
    'ai_processing_attempts:ai_attempts_member_read',
    'ai_processing_attempts:ai_attempts_operator_read',
    'audit_log:audit_log_member_read',
    'audit_log:audit_log_operator_read',
    'company_settings:company_settings_member_read',
    'company_settings:company_settings_admin_write',
    'platform_settings:platform_settings_authenticated_read',
    'platform_settings:platform_settings_operator_write',
    'impersonation_sessions:impersonation_operator_all',
    'impersonation_sessions:impersonation_target_read',
    'pending_operators:pending_operators_operator_all',
    'company_invites:company_invites_member_read',
    'company_invites:company_invites_admin_write',
    'company_invites:company_invites_public_token_read'
  ];
  entry text;
  parts text[];
  tbl text;
  pname text;
begin
  foreach entry in array tenant_policies loop
    parts := string_to_array(entry, ':');
    tbl := parts[1];
    pname := parts[2];
    -- Ensure the baseline policy exists; if not, the original 020 migration
    -- was presumably skipped, which is a bigger problem than this guard can
    -- fix. We only re-assert existence via pg_policies lookup.
    perform 1 from pg_policies where schemaname = 'public'
      and tablename = tbl and policyname = pname;
    if not found then
      raise warning 'idempotency_guard: policy %.% not found; did migration 020 run?', tbl, pname;
    end if;
  end loop;
end
$guard$;

comment on schema public is
  'hr-ats public schema. See supabase/migrations/20260420000210_idempotency_guard.sql for the migration-idempotency convention.';
