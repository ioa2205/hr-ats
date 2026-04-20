-- 120_pending_operator_promotions.sql
-- PR #5: two-operator approval flow for promoting/demoting operators.
-- Any operator can propose; a second operator approves from the Inbox.
-- Self-approval is blocked at the API layer.

create type operator_promotion_kind as enum ('promote', 'demote');
create type operator_promotion_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table pending_operator_promotions (
  id                bigserial primary key,
  target_user_id    uuid not null references profiles(id) on delete cascade,
  proposer_user_id  uuid not null references profiles(id) on delete cascade,
  kind              operator_promotion_kind not null,
  reason            text not null check (length(reason) between 10 and 1000),
  status            operator_promotion_status not null default 'pending',
  approver_user_id  uuid references profiles(id) on delete set null,
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),

  constraint promotion_distinct_actors
    check (approver_user_id is null or approver_user_id <> proposer_user_id)
);

-- Only one pending request per (target, kind) at a time.
create unique index idx_pending_promotions_one_active
  on pending_operator_promotions(target_user_id, kind)
  where status = 'pending';

create index idx_pending_promotions_status
  on pending_operator_promotions(status, created_at desc);

alter table pending_operator_promotions enable row level security;

create policy operator_promotions_all on pending_operator_promotions
  for all
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true)
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true);

grant select, insert, update, delete on pending_operator_promotions to authenticated, service_role;
grant usage, select on sequence pending_operator_promotions_id_seq to authenticated, service_role;
