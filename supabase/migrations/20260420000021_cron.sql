-- 021_cron.sql
-- Scheduled maintenance via pg_cron. Extends the pre-multi-tenant set with
-- tenant-specific housekeeping: CV retention, trial expiry, invite cleanup,
-- OTP cleanup.

-- === retry-pending-cvs (every 2 minutes) ===
-- Calls the process-cv Edge Function to reattempt stuck analyses.
select cron.schedule(
  'retry-pending-cvs',
  '*/2 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/process-cv',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
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

-- === cleanup-rate-limits (hourly) ===
select cron.schedule(
  'cleanup-rate-limits',
  '30 * * * *',
  $$ delete from rate_limits where expires_at < now() $$
);

-- === refresh-storage-usage (hourly) ===
select cron.schedule(
  'refresh-storage-usage',
  '0 * * * *',
  $$ refresh materialized view storage_usage $$
);

-- === refresh-company-usage-30d (hourly) ===
select cron.schedule(
  'refresh-company-usage-30d',
  '15 * * * *',
  $$ refresh materialized view concurrently company_usage_30d $$
);

-- === cleanup-orphan-cvs (nightly 03:00) ===
-- Deletes storage objects whose candidate row no longer references them.
select cron.schedule(
  'cleanup-orphan-cvs',
  '0 3 * * *',
  $$
    delete from storage.objects so
    where so.bucket_id = 'cvs'
      and not exists (
        select 1 from candidates c where c.cv_storage_path = so.name
      );
  $$
);

-- === cv-retention (nightly 03:15) ===
-- Delete PDF from storage after 30 days OR when candidate is rejected.
-- The candidates row and AI insights are kept forever; only cv_storage_path is nulled.
select cron.schedule(
  'cv-retention',
  '15 3 * * *',
  $$
    with expired as (
      select id, cv_storage_path
      from candidates
      where cv_storage_path is not null
        and (
          status = 'rejected'
          or created_at < now() - interval '30 days'
        )
    ),
    _deleted as (
      delete from storage.objects
      where bucket_id = 'cvs'
        and name in (select cv_storage_path from expired)
      returning 1
    )
    update candidates
       set cv_storage_path = null
     where id in (select id from expired);
  $$
);

-- === trial-expiry (nightly 03:30) ===
select cron.schedule(
  'trial-expiry',
  '30 3 * * *',
  $$
    update subscriptions
       set status = 'expired'
     where status = 'trialing'
       and trial_ends_at < now();
  $$
);

-- === cleanup-expired-invites (hourly :20) ===
select cron.schedule(
  'cleanup-expired-invites',
  '20 * * * *',
  $$
    delete from company_invites
    where expires_at < now()
      and accepted_at is null;
  $$
);

-- === cleanup-expired-otps (hourly :25) ===
select cron.schedule(
  'cleanup-expired-otps',
  '25 * * * *',
  $$
    delete from phone_otp_attempts
    where expires_at < now() - interval '1 day';
  $$
);
