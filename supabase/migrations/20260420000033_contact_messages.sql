-- 033_contact_messages.sql
-- Public contact form submissions from the landing / /contact page.
-- Insertable by anyone (anon + authenticated). Readable only by operators.
-- Rate limiting is enforced at the application layer via lib/rate-limit.ts.

create table contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text,
  message     text not null,
  locale      text,
  source      text not null default 'web',
  created_at  timestamptz not null default now()
);

create index idx_contact_messages_created_at on contact_messages(created_at desc);

alter table contact_messages enable row level security;

create policy contact_messages_public_insert
  on contact_messages for insert
  to anon, authenticated
  with check (true);

create policy contact_messages_operator_select
  on contact_messages for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean is true);
