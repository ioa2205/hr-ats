-- 019_triggers.sql
-- Trigger wiring: updated_at maintenance, auth.users→profiles bridge,
-- operator auto-elevation, JWT claim sync.

-- === updated_at triggers ===
create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

create trigger trg_job_postings_updated_at
  before update on job_postings
  for each row execute function set_updated_at();

create trigger trg_candidates_updated_at
  before update on candidates
  for each row execute function set_updated_at();

create trigger trg_company_settings_updated_at
  before update on company_settings
  for each row execute function set_updated_at();

create trigger trg_platform_settings_updated_at
  before update on platform_settings
  for each row execute function set_updated_at();

-- === auto-provision profiles from auth.users ===
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- === operator elevation chain ===
-- 1) when profile is first created, flip is_operator if email matches allow-list
create trigger trg_profiles_auto_elevate
  after insert on profiles
  for each row execute function auto_elevate_operator();

-- 2) whenever is_operator changes, mirror into auth.users.raw_app_meta_data
create trigger trg_profiles_sync_operator_claim
  after insert or update of is_operator on profiles
  for each row execute function sync_operator_jwt_claim();
