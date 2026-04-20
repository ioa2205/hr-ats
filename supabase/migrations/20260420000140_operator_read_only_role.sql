-- 140_operator_read_only_role.sql
-- PR #9: read-only operator role. `is_operator` stays as the gate for
-- /operator/*; `operator_role` narrows write permissions at the API layer.
--
-- Pure SQL only — no PL/pgSQL function bodies here so the Supabase Studio
-- SQL editor applies this file without splitting on internal semicolons.
-- The JWT-claim sync for operator_role is performed from the API route
-- `/api/operator/team` (POST/PATCH) — it calls
-- `supabase.auth.admin.updateUserById(...)` immediately after writing to
-- `profiles.operator_role`, so clients see the change on next token refresh.
-- `is_operator` continues to be synced by the existing
-- `sync_operator_jwt_claim` trigger from migration 018.

create type operator_role as enum ('full', 'read_only');

alter table profiles
  add column if not exists operator_role operator_role not null default 'full';

-- Backfill: every existing operator is full-access by default.
update profiles
   set operator_role = 'full'
 where is_operator = true
   and operator_role is distinct from 'full';
