-- 018_functions.sql
-- Shared functions: updated_at trigger body, rate limiting, membership lookup,
-- storage totals RPC, auth.users sync, operator auto-elevation, JWT claim sync.

-- === set_updated_at — shared trigger body ===
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- === consume_rate_limit — atomic concurrent-safe rate limiter ===
create or replace function consume_rate_limit(
  p_key text, p_limit int, p_window_seconds int
) returns table(allowed boolean, remaining int, retry_after int)
language plpgsql as $$
declare
  row rate_limits%rowtype;
  now_ts timestamptz := now();
begin
  insert into rate_limits (key, count, window_start, expires_at)
    values (p_key, 1, now_ts, now_ts + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case
                  when rate_limits.expires_at < now_ts then 1
                  else rate_limits.count + 1
                end,
        window_start = case
                  when rate_limits.expires_at < now_ts then now_ts
                  else rate_limits.window_start
                end,
        expires_at = case
                  when rate_limits.expires_at < now_ts
                  then now_ts + make_interval(secs => p_window_seconds)
                  else rate_limits.expires_at
                end
    returning * into row;

  return query select
    row.count <= p_limit as allowed,
    greatest(p_limit - row.count, 0) as remaining,
    case when row.count > p_limit
         then extract(epoch from row.expires_at - now_ts)::int
         else 0 end as retry_after;
end; $$;

-- === user_companies — returns company IDs the caller belongs to ===
-- security definer so RLS policies can call it without recursive policy evaluation.
create or replace function user_companies()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from company_members where user_id = auth.uid()
$$;

-- === get_storage_usage — legacy RPC used by the operator storage widget ===
create or replace function get_storage_usage()
returns table(total_bytes bigint, file_count bigint)
language sql
security definer
set search_path = public
as $$
  select total_bytes, file_count from storage_usage
$$;

-- === handle_new_auth_user — auto-create profiles row on auth.users insert ===
-- Full name is pulled from raw_user_meta_data.full_name when available,
-- otherwise falls back to the email local-part.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone, locale)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    new.phone,
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'ru')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- === auto_elevate_operator — flips is_operator when email is on allow-list ===
create or replace function auto_elevate_operator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from pending_operators where lower(email) = lower(new.email)) then
    update profiles set is_operator = true where id = new.id and is_operator = false;
  end if;
  return new;
end; $$;

-- === sync_operator_jwt_claim — mirror profiles.is_operator into auth.users.raw_app_meta_data ===
-- The claim surfaces as `is_operator` in JWT on next session refresh.
create or replace function sync_operator_jwt_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
     set raw_app_meta_data =
       coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_operator', new.is_operator)
   where id = new.id;
  return new;
end; $$;
