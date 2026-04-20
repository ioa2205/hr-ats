-- 024_p7_quota_atomic.sql
-- Phase 7: atomic CV quota consumption + idempotent re-schedule of trial-expiry.

-- === try_consume_cv_quota — atomic check-and-bump ===
-- Returns true when a CV slot was successfully consumed for the company.
-- Pro (status='active') succeeds without bumping the counter.
-- Trialing within quota succeeds and bumps. Anything else returns false.
create or replace function try_consume_cv_quota(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status subscription_status;
  v_used   int;
  v_limit  int;
  v_trial  timestamptz;
begin
  select status, cv_quota_used, cv_quota_limit, trial_ends_at
    into v_status, v_used, v_limit, v_trial
    from subscriptions
   where company_id = p_company_id
     for update;

  if not found then
    return false;
  end if;

  if v_status = 'active' then
    return true;
  end if;

  if v_status = 'trialing'
     and v_trial > now()
     and v_used < v_limit then
    update subscriptions
       set cv_quota_used = cv_quota_used + 1,
           updated_at = now()
     where company_id = p_company_id;
    return true;
  end if;

  return false;
end; $$;

-- === idempotent re-schedule of trial-expiry cron ===
-- The job was first scheduled in 021_cron.sql; this re-asserts the schedule
-- so a clean P7 migration alone is enough to enforce trial expiry.
do $$
begin
  perform cron.unschedule('trial-expiry');
exception when others then
  null;
end $$;

select cron.schedule(
  'trial-expiry',
  '30 3 * * *',
  $$
    update subscriptions
       set status = 'expired',
           updated_at = now()
     where status = 'trialing'
       and trial_ends_at < now();
  $$
);
