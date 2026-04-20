-- 220_interview_quota_atomic.sql
-- P0-3: atomic interview-request creation with locked quota check.
--
-- Previously the HR portal did a TS-side canScheduleInterview() read, then an
-- unlocked insert into interview_requests, opening a TOCTOU window. Replaces
-- that two-step with a single SECURITY DEFINER RPC that locks the company's
-- subscription row, counts existing booked interviews inside the lock, and
-- only inserts the request + slot rows on success. Serializes all concurrent
-- callers for the same company_id.
--
-- Mirrors the pattern in migration 024 (try_consume_cv_quota).

-- Trial-only booking cap for interviews (last 30 days, status='booked').
-- Matches TRIAL_INTERVIEW_BOOKINGS_LIMIT in lib/companies/quota.ts.

create or replace function book_interview_request(
  p_company_id       uuid,
  p_candidate_id     uuid,
  p_job_posting_id   uuid,
  p_created_by       uuid,
  p_duration_minutes int,
  p_location_kind    interview_location_kind,
  p_location_detail  text,
  p_hr_message       text,
  p_slot_start_ats   timestamptz[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status        subscription_status;
  v_trial         timestamptz;
  v_used          int;
  v_limit         int := 3; -- TRIAL_INTERVIEW_BOOKINGS_LIMIT
  v_request_id    uuid;
  v_public_token  text;
  v_expires_at    timestamptz;
begin
  -- Lock the subscription row so concurrent callers serialize.
  select status, trial_ends_at
    into v_status, v_trial
    from subscriptions
   where company_id = p_company_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_subscription');
  end if;

  -- Only active or in-window trialing subscriptions can create requests.
  if v_status = 'active' then
    null; -- unlimited
  elsif v_status = 'trialing' and v_trial > now() then
    select count(*) into v_used
      from interview_requests
     where company_id = p_company_id
       and status = 'booked'
       and booked_at >= now() - interval '30 days';

    if v_used >= v_limit then
      return jsonb_build_object(
        'ok', false,
        'error', 'scheduling_quota_exceeded',
        'used', v_used,
        'limit', v_limit
      );
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'subscription_inactive');
  end if;

  -- Validate job + candidate belong to the same company as the subscription.
  -- (Service-role bypasses RLS; this protects against malformed RPC callers.)
  if not exists (
    select 1 from job_postings
     where id = p_job_posting_id and company_id = p_company_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'job_not_found');
  end if;

  if not exists (
    select 1 from candidates c
     join job_postings j on j.id = c.job_posting_id
     where c.id = p_candidate_id and j.company_id = p_company_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'candidate_not_found');
  end if;

  -- Insert the request.
  insert into interview_requests (
    company_id, candidate_id, job_posting_id, created_by,
    duration_minutes, location_kind, location_detail, hr_message
  ) values (
    p_company_id, p_candidate_id, p_job_posting_id, p_created_by,
    p_duration_minutes, p_location_kind, p_location_detail, p_hr_message
  )
  returning id, public_token, expires_at
    into v_request_id, v_public_token, v_expires_at;

  -- Insert slots sorted by start_at ascending, position = 0..n-1.
  insert into interview_slots (request_id, start_at, position)
  select v_request_id,
         t.start_at,
         (row_number() over (order by t.start_at) - 1)::smallint
    from unnest(p_slot_start_ats) as t(start_at);

  return jsonb_build_object(
    'ok',           true,
    'id',           v_request_id,
    'public_token', v_public_token,
    'expires_at',   v_expires_at
  );
end;
$$;

grant execute on function book_interview_request(
  uuid, uuid, uuid, uuid, int, interview_location_kind, text, text, timestamptz[]
) to authenticated, service_role;
