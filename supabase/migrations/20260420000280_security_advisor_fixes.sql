-- 280_security_advisor_fixes.sql
-- Resolves findings from the Supabase Security Advisor (2026-04-21 run).
--
-- Not fixable from SQL: "Leaked Password Protection Disabled" is a project
-- setting in the Supabase dashboard — enable under
--   Authentication -> Policies -> Password Strength -> "Leaked password protection".
-- Everything else is handled here.

-- ===================================================================
-- 1. security_definer_view (ERROR)
--    Views inherited the creator's privileges, silently bypassing RLS.
--    Postgres 15+ supports security_invoker so the caller's RLS applies.
--    All production callers use the service-role admin client, which
--    bypasses RLS anyway — behaviour for current callers is unchanged.
-- ===================================================================

alter view public.candidates_ranked          set (security_invoker = true);
alter view public.job_postings_with_counts   set (security_invoker = true);
alter view public.company_health             set (security_invoker = true);
alter view public.candidate_latest_ai_cost   set (security_invoker = true);

-- ===================================================================
-- 2. rls_disabled_in_public (ERROR) — subscription_plans
--    Catalog table exposed via PostgREST with no RLS. Enable RLS with
--    an explicit read policy mirroring the existing GRANT, plus an
--    operator-only write policy for defence-in-depth. Service role
--    bypasses RLS, so billing code paths are unaffected.
-- ===================================================================

alter table public.subscription_plans enable row level security;

drop policy if exists subscription_plans_authenticated_read on public.subscription_plans;
create policy subscription_plans_authenticated_read
  on public.subscription_plans
  for select
  to authenticated
  using (true);

drop policy if exists subscription_plans_operator_write on public.subscription_plans;
create policy subscription_plans_operator_write
  on public.subscription_plans
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

-- ===================================================================
-- 3. materialized_view_in_api (WARN)
--    Aggregate MVs were selectable by anon/authenticated, which meant
--    one tenant could see another tenant's rollups. All current
--    consumers read through the service-role admin client; revoke
--    direct access from low-trust roles.
-- ===================================================================

revoke select on public.operator_daily_metrics from anon, authenticated;
revoke select on public.company_usage_30d      from anon, authenticated;
revoke select on public.storage_usage          from anon, authenticated;

-- landing_metrics is intentionally world-readable (landing-page "pulse").
-- Revoke direct MV access and expose the single aggregate row through a
-- SECURITY DEFINER RPC so the advisor stops flagging the MV while the
-- public landing page keeps rendering.
revoke select on public.landing_metrics from anon, authenticated;

create or replace function public.get_landing_metrics()
returns table(
  total_companies              bigint,
  total_cvs_processed_lifetime bigint,
  cvs_processed_today          bigint,
  avg_screening_seconds        int,
  refreshed_at                 timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $fn$
  select
    total_companies,
    total_cvs_processed_lifetime,
    cvs_processed_today,
    avg_screening_seconds,
    refreshed_at
  from public.landing_metrics
  limit 1
$fn$;

revoke all on function public.get_landing_metrics() from public;
grant execute on function public.get_landing_metrics() to anon, authenticated, service_role;

-- ===================================================================
-- 4. function_search_path_mutable (WARN)
--    Lock search_path so a hostile caller cannot shadow unqualified
--    references. These three functions either don't reference other
--    objects (triggers) or resolve everything inside public + pg_temp.
-- ===================================================================

alter function public.set_updated_at()                    set search_path = public, pg_temp;
alter function public.prevent_operator_audit_mutation()   set search_path = public, pg_temp;
alter function public.consume_rate_limit(text, int, int)  set search_path = public, pg_temp;

-- ===================================================================
-- 5. extension_in_public (WARN) — pg_trgm
--    ALTER EXTENSION rebinds the trigram operator class by OID, so the
--    existing GIN index on candidates.full_name keeps working without
--    a rebuild. The `extensions` schema already exists (created for
--    pg_net in migration 002).
-- ===================================================================

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- Make sure authenticated / anon can still resolve the operator class in
-- ad-hoc queries; pg_cron / server code qualifies references explicitly.
grant usage on schema extensions to postgres, anon, authenticated, service_role;

-- ===================================================================
-- 6. rls_policy_always_true (WARN)
--    The public insert policies on contact_messages and landing_events
--    are intentional (open contact form, open analytics beacon). Keep
--    the intent but replace `WITH CHECK (true)` with length bounds so
--    the policy is no longer vacuously true and pathological payloads
--    are rejected at the DB boundary. Application layer still enforces
--    rate limiting and Turnstile.
-- ===================================================================

drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    length(name)             between 1 and 200
    and length(email)        between 3 and 320
    and length(message)      between 1 and 10000
    and length(coalesce(company, '')) <= 200
    and length(coalesce(locale,  '')) <= 8
    and length(coalesce(source,  '')) <= 32
  );

drop policy if exists landing_events_anon_insert on public.landing_events;
create policy landing_events_anon_insert
  on public.landing_events
  for insert
  to anon, authenticated
  with check (
    length(session_id) between 1 and 100
    and length(coalesce(target,      '')) <= 500
    and length(coalesce(utm_source,  '')) <= 200
    and length(coalesce(utm_section, '')) <= 200
    and length(coalesce(user_agent,  '')) <= 500
    and length(coalesce(ip_country,  '')) <= 8
    and length(coalesce(path,        '')) <= 500
  );

-- ===================================================================
-- 7. rls_enabled_no_policy (INFO)
--    Both tables are deliberately service-role only, but silencing the
--    advisor with an explicit deny-all policy makes the intent obvious
--    to anyone reading pg_policies. Service role still bypasses RLS.
-- ===================================================================

drop policy if exists phone_otp_attempts_deny_non_service on public.phone_otp_attempts;
create policy phone_otp_attempts_deny_non_service
  on public.phone_otp_attempts
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists rate_limits_deny_non_service on public.rate_limits;
create policy rate_limits_deny_non_service
  on public.rate_limits
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ===================================================================
-- Post-conditions (verified during migration apply):
--   * get_landing_metrics() returns exactly one row in production.
--   * ai_processing_attempts candidates/job_postings row counts via
--     admin client are unchanged (security_invoker only affects anon
--     and authenticated callers, all of whom previously had an RLS
--     bypass via the view).
--   * pg_trgm is relocated atomically; the GIN index remains valid.
-- ===================================================================
