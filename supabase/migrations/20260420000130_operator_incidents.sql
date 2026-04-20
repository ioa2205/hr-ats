-- 130_operator_incidents.sql
-- PR #6: rule-based incident detection. Rules live in a table so operators
-- can mute or tune them at runtime without redeploy. Incidents are emitted
-- by the /api/operator/cron/detect-incidents route every 5 minutes.

create type incident_severity as enum ('info', 'warn', 'critical');
create type incident_status as enum ('firing', 'acknowledged', 'resolved');

create table operator_alert_rules (
  id              text primary key,                       -- stable rule id, e.g. 'ai_cost_spike'
  severity        incident_severity not null default 'warn',
  description     text not null,
  remediation     text,
  muted_until     timestamptz,                             -- global mute
  muted_for_tenants jsonb not null default '{}'::jsonb,    -- { company_id: mute_until_iso }
  enabled         boolean not null default true,
  updated_at      timestamptz not null default now()
);

create table operator_incidents (
  id               bigserial primary key,
  rule_id          text not null references operator_alert_rules(id) on delete cascade,
  severity         incident_severity not null,
  target_type      text,                                   -- 'company' | 'user' | 'platform'
  target_id        uuid,
  target_label     text,
  summary          text not null,
  details          jsonb not null default '{}'::jsonb,
  status           incident_status not null default 'firing',
  ack_by_user_id   uuid references profiles(id) on delete set null,
  ack_at           timestamptz,
  resolved_by_user_id uuid references profiles(id) on delete set null,
  resolved_at      timestamptz,
  resolution_note  text,
  first_fired_at   timestamptz not null default now(),
  last_fired_at    timestamptz not null default now()
);

-- Idempotency key: don't fire the same rule+target twice while firing.
create unique index idx_operator_incidents_one_active
  on operator_incidents(rule_id, coalesce(target_id::text, ''))
  where status = 'firing';

create index idx_operator_incidents_status_created
  on operator_incidents(status, first_fired_at desc);
create index idx_operator_incidents_target
  on operator_incidents(target_type, target_id);

alter table operator_alert_rules enable row level security;
alter table operator_incidents enable row level security;

create policy rules_operator_all on operator_alert_rules
  for all to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

create policy incidents_operator_all on operator_incidents
  for all to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select, insert, update, delete on operator_alert_rules to authenticated, service_role;
grant select, insert, update, delete on operator_incidents to authenticated, service_role;
grant usage, select on sequence operator_incidents_id_seq to authenticated, service_role;

-- Seed rules (idempotent).
insert into operator_alert_rules (id, severity, description, remediation) values
  ('ai_cost_spike',       'warn',     'Tenant''s rolling 24h AI cost > 5× rolling 7d daily avg AND > $5.',              'Check Gemini usage; consider temporary quota cap.'),
  ('quota_exhausted',     'warn',     'Tenant hit 100% of CV quota.',                                                   'Reach out; offer Pro upgrade.'),
  ('trial_expiring',      'info',     'Trial ends in ≤ 3 days.',                                                        'Nudge owner via Inbox/support.'),
  ('ai_failure_burst',    'critical', 'Tenant > 25% Gemini failures over 1h with > 10 attempts.',                       'Check Gemini status; verify prompts.'),
  ('suspicious_upload',   'warn',     '> 50 candidates added to one posting in < 10 minutes.',                          'Possible scraping; inspect candidate list.'),
  ('login_anomaly',       'warn',     'Same user, > 3 distinct IP countries within 24 hours.',                          'Contact user; consider forced sign-out.'),
  ('operator_action_burst','warn',    'Same operator, > 20 mutations in 5 minutes.',                                    'Confirm operator is aware; pause if needed.')
on conflict (id) do nothing;
