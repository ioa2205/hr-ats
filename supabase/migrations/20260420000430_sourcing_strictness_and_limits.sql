-- 430_sourcing_strictness_and_limits.sql
-- Two related additions to active sourcing:
--   1. A per-run matching strictness ('strict' | 'balanced' | 'broad'). Looser
--      modes lower the gate confidence floor and tolerate a few unmet hard
--      requirements, keeping those candidates as flagged near-misses instead of
--      dropping them — so a small or niche talent pool still returns results.
--   2. Operator-controllable per-run search limits (max fetched, max judge
--      calls, shortlist size), seeded as platform_settings defaults. Blank/unset
--      ⇒ the engine's built-in defaults (resolveSourcingBudget falls through).

-- 1a. Strictness chosen for each search (re-read verbatim on retry).
alter table sourcing_searches
  add column if not exists strictness text not null default 'balanced'
  check (strictness in ('strict', 'balanced', 'broad'));

-- 1b. Near-miss flags on a shortlisted candidate. `near_miss` marks a candidate
--     that missed one or more tolerated hard requirements; `missed_requirements`
--     stores those requirements' labels for display.
alter table sourced_candidates
  add column if not exists near_miss boolean not null default false;
alter table sourced_candidates
  add column if not exists missed_requirements jsonb not null default '[]'::jsonb;

-- 2. Operator-tunable per-run budget. Seeded with the historical engine defaults
--    so the visible value matches behavior; an operator can raise/lower them
--    from the console. resolveSourcingBudget reads these (and per-company
--    manual_override) at run start.
insert into platform_settings (key, value) values
  ('sourcing_max_fetched', '200'),
  ('sourcing_max_pro_calls', '450'),
  ('sourcing_shortlist_size', '30')
on conflict (key) do nothing;
