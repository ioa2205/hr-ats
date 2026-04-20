-- 034_contact_messages_read_at.sql
-- Track which contact_messages have been reviewed by an operator.
-- read_at is NULL until an operator marks the message read.

alter table contact_messages
  add column if not exists read_at timestamptz;

create index if not exists idx_contact_messages_unread
  on contact_messages(created_at desc)
  where read_at is null;

-- Operators can update read_at via the server action (admin client bypasses
-- RLS), but we also allow operator-role updates through the authenticated
-- path for future client-side mutations.
create policy contact_messages_operator_update
  on contact_messages for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean is true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean is true);
