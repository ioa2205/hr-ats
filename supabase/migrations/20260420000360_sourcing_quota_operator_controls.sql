-- 360_sourcing_quota_operator_controls.sql
-- Make active-sourcing quota manageable from the operator console and stop
-- default tenants from exhausting the feature after two exploratory runs.

alter table subscriptions
  alter column sourcing_quota_limit set default 50;

insert into platform_settings (key, value) values
  ('default_sourcing_quota', '50')
on conflict (key) do nothing;

-- Existing tenants that still have the original rollout default get the new
-- trial cap. Preserve any explicit operator override that already set sourcing.
update subscriptions
   set sourcing_quota_limit = 50,
       updated_at = now()
 where sourcing_quota_limit = 2
   and not (coalesce(manual_override, '{}'::jsonb) ? 'sourcing_quota_limit');
