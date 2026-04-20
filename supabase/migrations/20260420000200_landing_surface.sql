-- Landing surface infrastructure: customers, case studies, events, metrics view.
-- Anon SELECT on customer / study rows where they are marked live; writes are operator-only.

-- ---------------------------------------------------------------------------
-- landing_customers: companies we publicly name on the landing page
-- ---------------------------------------------------------------------------
create table if not exists public.landing_customers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  logo_url text,
  industry text,
  display_order int not null default 100,
  live_at timestamptz,
  consent_given_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_customers_live_idx
  on public.landing_customers (display_order, live_at)
  where live_at is not null;

alter table public.landing_customers enable row level security;

-- Public read: only rows with live_at in the past and explicit consent
create policy "landing_customers_public_read"
  on public.landing_customers
  for select
  to anon, authenticated
  using (live_at is not null and live_at <= now() and consent_given_at is not null);

-- Operator full read
create policy "landing_customers_operator_read"
  on public.landing_customers
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

-- Operator writes
create policy "landing_customers_operator_write"
  on public.landing_customers
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

-- ---------------------------------------------------------------------------
-- landing_case_studies: richer proof stories tied to a customer
-- ---------------------------------------------------------------------------
create table if not exists public.landing_case_studies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  customer_id uuid references public.landing_customers(id) on delete restrict,
  headline_ru text not null,
  headline_uz text not null,
  headline_en text not null,
  quote_ru text not null,
  quote_uz text not null,
  quote_en text not null,
  speaker_name text not null,
  speaker_role text not null,
  speaker_photo_url text,
  industry text,
  metric_1_value text not null,
  metric_1_label_ru text not null,
  metric_1_label_uz text not null,
  metric_1_label_en text not null,
  metric_2_value text,
  metric_2_label_ru text,
  metric_2_label_uz text,
  metric_2_label_en text,
  metric_3_value text,
  metric_3_label_ru text,
  metric_3_label_uz text,
  metric_3_label_en text,
  featured boolean not null default false,
  published_at timestamptz,
  customer_consent_given_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_case_studies_published_idx
  on public.landing_case_studies (published_at desc)
  where published_at is not null;

alter table public.landing_case_studies enable row level security;

create policy "landing_case_studies_public_read"
  on public.landing_case_studies
  for select
  to anon, authenticated
  using (
    published_at is not null
    and published_at <= now()
    and customer_consent_given_at is not null
  );

create policy "landing_case_studies_operator_read"
  on public.landing_case_studies
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

create policy "landing_case_studies_operator_write"
  on public.landing_case_studies
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

-- ---------------------------------------------------------------------------
-- landing_events: conversion instrumentation for the landing page itself
-- ---------------------------------------------------------------------------
create table if not exists public.landing_events (
  id bigserial primary key,
  session_id text not null,
  locale text not null check (locale in ('ru', 'uz', 'en')),
  event text not null check (
    event in (
      'page_view',
      'cta_click',
      'demo_open',
      'demo_complete',
      'pricing_compare_open',
      'faq_expand',
      'contact_submit'
    )
  ),
  target text,
  utm_source text,
  utm_section text,
  user_agent text,
  ip_country text,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists landing_events_created_idx
  on public.landing_events (created_at desc);
create index if not exists landing_events_event_created_idx
  on public.landing_events (event, created_at desc);
create index if not exists landing_events_session_idx
  on public.landing_events (session_id, created_at);

alter table public.landing_events enable row level security;

-- Anon can insert; the endpoint does its own rate limiting and validation.
-- No SELECT for anon.
create policy "landing_events_anon_insert"
  on public.landing_events
  for insert
  to anon, authenticated
  with check (true);

create policy "landing_events_operator_read"
  on public.landing_events
  for select
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false));

-- ---------------------------------------------------------------------------
-- landing_metrics: precomputed platform-wide aggregates for the hero pulse
-- ---------------------------------------------------------------------------
-- Materialized view so anon can read aggregates without row-level visibility
-- into the underlying tenant data. Refresh cadence: hourly, via cron.
drop materialized view if exists public.landing_metrics;

create materialized view public.landing_metrics as
select
  (select count(*) from public.companies where status = 'active')::bigint as total_companies,
  (select count(*) from public.ai_processing_attempts where status = 'success')::bigint
    as total_cvs_processed_lifetime,
  (select count(*) from public.ai_processing_attempts
     where status = 'success' and created_at > now() - interval '1 day')::bigint
    as cvs_processed_today,
  (select (avg(duration_ms) / 1000.0)::int
     from public.ai_processing_attempts
     where status = 'success' and duration_ms is not null
       and created_at > now() - interval '30 days')::int
    as avg_screening_seconds,
  now() as refreshed_at;

create unique index if not exists landing_metrics_singleton_idx
  on public.landing_metrics (refreshed_at);

grant select on public.landing_metrics to anon, authenticated;

-- Initial materialization. Further refreshes happen via the cron endpoint
-- (see /api/landing/cron/refresh-metrics).
refresh materialized view public.landing_metrics;

-- RPC used by the refresh-metrics cron endpoint. Service role only.
create or replace function public.refresh_landing_metrics()
returns void
language sql
security definer
set search_path = public
as $fn$
  refresh materialized view public.landing_metrics;
$fn$;

revoke all on function public.refresh_landing_metrics() from public, anon, authenticated;
grant execute on function public.refresh_landing_metrics() to service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse the shared set_updated_at() defined in 00018)
-- ---------------------------------------------------------------------------
drop trigger if exists landing_customers_set_updated_at on public.landing_customers;
create trigger landing_customers_set_updated_at
  before update on public.landing_customers
  for each row execute function public.set_updated_at();

drop trigger if exists landing_case_studies_set_updated_at on public.landing_case_studies;
create trigger landing_case_studies_set_updated_at
  before update on public.landing_case_studies
  for each row execute function public.set_updated_at();
