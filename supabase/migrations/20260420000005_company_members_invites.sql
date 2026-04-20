-- 005_company_members_invites.sql
-- M:N membership between profiles and companies, plus pending invites.

create table company_members (
  company_id uuid not null references companies(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       company_role not null,
  joined_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index idx_company_members_user on company_members(user_id);

-- Exactly one Owner per company (partial unique index).
create unique index one_owner_per_company
  on company_members(company_id)
  where role = 'owner';

-- === company_invites ===
create table company_invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  email       text not null,
  role        company_role not null,
  invited_by  uuid not null references profiles(id),
  token       text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);

create index idx_company_invites_token on company_invites(token);
create index idx_company_invites_expires on company_invites(expires_at) where accepted_at is null;
