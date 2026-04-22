-- 290_interview_requests_created_by_nullable.sql
-- interview_requests.created_by references auth.users without an ON DELETE
-- rule, which blocks Supabase "Delete user" for any HR who ever scheduled
-- an interview. Relax to `on delete set null` so auth.users rows can be
-- removed without a hard FK violation; keep the creator id when available
-- for audit purposes.

alter table interview_requests
  alter column created_by drop not null;

alter table interview_requests
  drop constraint if exists interview_requests_created_by_fkey,
  add constraint interview_requests_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
