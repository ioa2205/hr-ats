-- 020_rls_policies.sql
-- Enable RLS and define policies for every public-schema table plus storage.
-- Pattern: policies join through company_members (via user_companies()) so a
-- user only sees rows belonging to companies they are a member of.
-- Service role bypasses all policies as per Supabase defaults.
-- Operators get a cross-tenant override via the is_operator JWT claim.

-- ===================================================================
-- Enable RLS on every public table
-- ===================================================================
alter table profiles                 enable row level security;
alter table companies                enable row level security;
alter table company_members          enable row level security;
alter table company_invites          enable row level security;
alter table subscriptions            enable row level security;
alter table phone_otp_attempts       enable row level security;
alter table job_postings             enable row level security;
alter table candidates               enable row level security;
alter table ai_processing_attempts   enable row level security;
alter table audit_log                enable row level security;
alter table company_settings         enable row level security;
alter table platform_settings        enable row level security;
alter table rate_limits              enable row level security;
alter table impersonation_sessions   enable row level security;
alter table pending_operators        enable row level security;

-- ===================================================================
-- profiles — users can read/update their own row; operators can read all
-- ===================================================================
create policy profiles_self_read on profiles
  for select using (id = auth.uid());

create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_operator_read on profiles
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- companies — members read; owner/admin update; operators read all
-- ===================================================================
create policy companies_member_read on companies
  for select using (id in (select user_companies()));

create policy companies_admin_update on companies
  for update using (
    id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy companies_operator_read on companies
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

create policy companies_operator_update on companies
  for update using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- company_members — members read their own company rosters;
-- owner/admin manage membership; users always read their own row
-- ===================================================================
create policy company_members_member_read on company_members
  for select using (company_id in (select user_companies()));

create policy company_members_self_read on company_members
  for select using (user_id = auth.uid());

create policy company_members_admin_insert on company_members
  for insert with check (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy company_members_admin_update on company_members
  for update using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy company_members_admin_delete on company_members
  for delete using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy company_members_operator_read on company_members
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- company_invites — members read; owner/admin manage
-- ===================================================================
create policy company_invites_member_read on company_invites
  for select using (company_id in (select user_companies()));

create policy company_invites_admin_write on company_invites
  for all using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Anon (invitee) reads a single invite by token via the /auth/accept-invite
-- page; the API route uses service role, this policy is defense-in-depth.
create policy company_invites_public_token_read on company_invites
  for select to anon
  using (accepted_at is null and expires_at > now());

-- ===================================================================
-- subscriptions — members read; owner updates; operator full
-- ===================================================================
create policy subscriptions_member_read on subscriptions
  for select using (company_id in (select user_companies()));

create policy subscriptions_owner_update on subscriptions
  for update using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy subscriptions_operator_all on subscriptions
  for all using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- phone_otp_attempts — service role only (no user-facing access needed)
-- ===================================================================
-- No non-service-role policies. RLS enabled means no other role can read.

-- ===================================================================
-- job_postings — full CRUD if member; anon read active by token
-- ===================================================================
create policy jobs_member_all on job_postings
  for all using (company_id in (select user_companies()));

create policy jobs_public_token_read on job_postings
  for select to anon
  using (status = 'active');

create policy jobs_operator_read on job_postings
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- candidates — members of the owning company read/update/delete
-- ===================================================================
create policy candidates_member_read on candidates
  for select using (
    job_posting_id in (
      select id from job_postings where company_id in (select user_companies())
    )
  );

create policy candidates_member_update on candidates
  for update using (
    job_posting_id in (
      select id from job_postings where company_id in (select user_companies())
    )
  );

create policy candidates_member_delete on candidates
  for delete using (
    job_posting_id in (
      select id from job_postings where company_id in (select user_companies())
    )
  );

create policy candidates_operator_read on candidates
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- ai_processing_attempts — members of the company read
-- ===================================================================
create policy ai_attempts_member_read on ai_processing_attempts
  for select using (company_id in (select user_companies()));

create policy ai_attempts_operator_read on ai_processing_attempts
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- audit_log — members read their company; operator reads all
-- ===================================================================
create policy audit_log_member_read on audit_log
  for select using (
    company_id is not null and company_id in (select user_companies())
  );

create policy audit_log_operator_read on audit_log
  for select using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- company_settings — members read; owner/admin write
-- ===================================================================
create policy company_settings_member_read on company_settings
  for select using (company_id in (select user_companies()));

create policy company_settings_admin_write on company_settings
  for all using (
    company_id in (
      select company_id from company_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ===================================================================
-- platform_settings — authenticated users read (fallback templates);
-- operator writes
-- ===================================================================
create policy platform_settings_authenticated_read on platform_settings
  for select to authenticated using (true);

create policy platform_settings_operator_write on platform_settings
  for all using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- impersonation_sessions — operator full; target user reads own sessions
-- ===================================================================
create policy impersonation_operator_all on impersonation_sessions
  for all using ((auth.jwt() ->> 'is_operator')::boolean = true);

create policy impersonation_target_read on impersonation_sessions
  for select using (target_user_id = auth.uid());

-- ===================================================================
-- pending_operators — operator only
-- ===================================================================
create policy pending_operators_operator_all on pending_operators
  for all using ((auth.jwt() ->> 'is_operator')::boolean = true);

-- ===================================================================
-- rate_limits — service role only (no user-facing access).
-- ===================================================================

-- ===================================================================
-- Storage: cvs bucket
-- Path scheme: {company_id}/{job_id}/{candidate_id}/cv.pdf
-- Members of the company can read; service role uploads and deletes.
-- ===================================================================
drop policy if exists "Service role can upload CVs" on storage.objects;
drop policy if exists "Service role can read CVs" on storage.objects;
drop policy if exists "Service role can delete CVs" on storage.objects;

create policy "cv_service_upload" on storage.objects
  for insert to service_role
  with check (bucket_id = 'cvs');

create policy "cv_service_read" on storage.objects
  for select to service_role
  using (bucket_id = 'cvs');

create policy "cv_service_delete" on storage.objects
  for delete to service_role
  using (bucket_id = 'cvs');

create policy "cv_company_member_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (storage.foldername(name))[1]::uuid in (select user_companies())
  );

create policy "cv_operator_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cvs'
    and (auth.jwt() ->> 'is_operator')::boolean = true
  );
