-- 080_interview_scheduling.sql
-- Interview scheduling: HR proposes 3–6 slots, the candidate picks one via
-- a token-gated public page. One booked slot per request. ICS download is
-- generated server-side by the Next.js app, not stored in the DB.
--
-- Token-gated reads/writes use SECURITY DEFINER RPCs so RLS on the underlying
-- tables stays closed for anonymous traffic. The read RPC trims candidate
-- PII to first name only.
--
-- IMPORTANT: every function body is written in pure SQL (no PL/pgSQL,
-- no SELECT INTO, no IF/THEN). Function bodies contain NO internal
-- semicolons. This is necessary because the Supabase Studio SQL editor
-- splits on `;` without respecting dollar-quote pairs — a PL/pgSQL
-- function body would be torn apart and individual lines would be
-- executed as bogus top-level statements.

-- ===================================================================
-- Enums
-- ===================================================================
create type interview_request_status as enum
  ('pending', 'booked', 'declined', 'cancelled', 'expired');

create type interview_location_kind as enum
  ('google_meet', 'telegram', 'phone', 'office', 'custom');

-- ===================================================================
-- Tables
-- ===================================================================
create table interview_requests (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  candidate_id      uuid not null references candidates(id) on delete cascade,
  job_posting_id    uuid not null references job_postings(id) on delete cascade,
  created_by        uuid not null references auth.users(id),
  public_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  duration_minutes  integer not null check (duration_minutes in (15, 30, 45, 60)),
  location_kind     interview_location_kind not null,
  location_detail   text,
  hr_message        text check (hr_message is null or
                                char_length(trim(hr_message)) between 1 and 500),
  candidate_note    text check (candidate_note is null or
                                char_length(trim(candidate_note)) between 1 and 300),
  status            interview_request_status not null default 'pending',
  booked_slot_id    uuid,
  booked_at         timestamptz,
  expires_at        timestamptz not null default (now() + interval '7 days'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table interview_slots (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references interview_requests(id) on delete cascade,
  start_at    timestamptz not null,
  position    smallint not null,
  created_at  timestamptz not null default now(),
  unique (request_id, position)
);

alter table interview_requests
  add constraint ir_booked_slot_fk
    foreign key (booked_slot_id)
    references interview_slots(id)
    on delete set null
    deferrable initially deferred;

create index ir_candidate_idx       on interview_requests(candidate_id);
create index ir_company_status_idx  on interview_requests(company_id, status);
create index ir_public_token_idx    on interview_requests(public_token);
create index ir_expires_pending_idx on interview_requests(expires_at)
  where status = 'pending';

create index islots_request_idx     on interview_slots(request_id, start_at);

-- ===================================================================
-- updated_at trigger (re-uses set_updated_at() from migration 018)
-- ===================================================================
create trigger trg_interview_requests_updated_at
  before update on interview_requests
  for each row execute function set_updated_at();

-- ===================================================================
-- RLS — mirrors `candidates` policies. Operator override on is_operator.
-- ===================================================================
alter table interview_requests enable row level security;
alter table interview_slots    enable row level security;

create policy interview_requests_member_read on interview_requests
  for select using (company_id in (select user_companies()));

create policy interview_requests_member_insert on interview_requests
  for insert with check (company_id in (select user_companies()));

create policy interview_requests_member_update on interview_requests
  for update using (company_id in (select user_companies()));

create policy interview_requests_operator_read on interview_requests
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

create policy interview_slots_member_read on interview_slots
  for select using (
    request_id in (
      select id from interview_requests
      where company_id in (select user_companies())
    )
  );

create policy interview_slots_member_insert on interview_slots
  for insert with check (
    request_id in (
      select id from interview_requests
      where company_id in (select user_companies())
    )
  );

create policy interview_slots_member_delete on interview_slots
  for delete using (
    request_id in (
      select id from interview_requests
      where company_id in (select user_companies())
    )
  );

create policy interview_slots_operator_read on interview_slots
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- Public token-gated read — pure SQL, SECURITY DEFINER.
-- Returns trimmed JSON (first name only, no phone/email/PII).
-- Returns NULL when the token is unknown.
-- ===================================================================
create or replace function get_interview_request_by_token(p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $func_get_interview$
  select jsonb_build_object(
    'id',                  r.id,
    'public_token',        r.public_token,
    'status',              r.status,
    'duration_minutes',    r.duration_minutes,
    'location_kind',       r.location_kind,
    'location_detail',     r.location_detail,
    'hr_message',          r.hr_message,
    'candidate_note',      r.candidate_note,
    'expires_at',          r.expires_at,
    'booked_slot_id',      r.booked_slot_id,
    'booked_at',           r.booked_at,
    'booked_start_at',     bs.start_at,
    'slots', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'id',       s.id,
                'start_at', s.start_at,
                'position', s.position
              ) order by s.position)
         from interview_slots s
        where s.request_id = r.id),
      '[]'::jsonb
    ),
    'candidate_first_name', split_part(coalesce(c.full_name, ''), ' ', 1),
    'job', jsonb_build_object(
      'id',       j.id,
      'title',    j.title,
      'title_ru', j.title_ru,
      'title_uz', j.title_uz,
      'title_en', j.title_en
    ),
    'company', jsonb_build_object(
      'id',             co.id,
      'name',           co.name,
      'logo_url',       co.logo_url,
      'default_locale', co.default_locale
    )
  )
  from interview_requests r
  left join candidates    c  on c.id  = r.candidate_id
  left join job_postings  j  on j.id  = r.job_posting_id
  left join companies     co on co.id = r.company_id
  left join interview_slots bs on bs.id = r.booked_slot_id
  where r.public_token = p_token
$func_get_interview$;

grant execute on function get_interview_request_by_token(text) to anon, authenticated;

-- ===================================================================
-- Public booking — pure SQL with chained CTEs. Atomic.
-- All branches operate on the same snapshot of `target`, so at most
-- one of `expire_action` / `book_action` updates a row.
-- ===================================================================
create or replace function book_interview_slot(p_token text, p_slot_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $func_book_interview$
  with target as (
    select id, status, expires_at
      from interview_requests
     where public_token = p_token
       for update
  ),
  slot_valid as (
    select 1
      from interview_slots
     where id = p_slot_id
       and request_id = (select id from target)
  ),
  expire_action as (
    update interview_requests
       set status = 'expired'
     where id = (
       select id from target
        where status = 'pending'
          and expires_at < now()
     )
     returning id
  ),
  book_action as (
    update interview_requests
       set status         = 'booked',
           booked_slot_id = p_slot_id,
           booked_at      = now()
     where id = (
       select id from target
        where status = 'pending'
          and expires_at >= now()
     )
       and exists (select 1 from slot_valid)
     returning id
  )
  select case
    when not exists (select 1 from target)
      then jsonb_build_object('ok', false, 'error', 'not_found')
    when exists (select 1 from expire_action)
      then jsonb_build_object('ok', false, 'error', 'expired')
    when exists (select 1 from book_action)
      then jsonb_build_object('ok', true)
    when (select status from target) <> 'pending'
      then jsonb_build_object('ok', false, 'error', 'invalid_state')
    else jsonb_build_object('ok', false, 'error', 'invalid_slot')
  end
$func_book_interview$;

grant execute on function book_interview_slot(text, uuid) to anon, authenticated;

-- ===================================================================
-- Public decline — pure SQL with chained CTEs.
-- ===================================================================
create or replace function decline_interview_request(p_token text, p_reason text)
returns jsonb
language sql
security definer
set search_path = public
as $func_decline_interview$
  with target as (
    select id, status from interview_requests
     where public_token = p_token
       for update
  ),
  decline_action as (
    update interview_requests
       set status         = 'declined',
           candidate_note = nullif(trim(coalesce(p_reason, '')), '')
     where id = (
       select id from target where status = 'pending'
     )
     returning id
  )
  select case
    when not exists (select 1 from target)
      then jsonb_build_object('ok', false, 'error', 'not_found')
    when exists (select 1 from decline_action)
      then jsonb_build_object('ok', true)
    else jsonb_build_object('ok', false, 'error', 'invalid_state')
  end
$func_decline_interview$;

grant execute on function decline_interview_request(text, text) to anon, authenticated;
