-- 091_avatars_logos_buckets.sql
-- Public read buckets for profile avatars and company logos.
-- Avatar paths: avatars/{user_id}/avatar.png (user-scoped — a user can belong
-- to many companies, so the avatar belongs to the user, not the workspace).
-- Logo paths: logos/{company_id}/logo.png.
-- 2MB per-file cap for avatars, 1MB for logos.
--
-- Apply via `supabase db push` or the Supabase Studio SQL editor (no function
-- bodies in this file, so it's safe for either).

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('logos', 'logos', true, 1048576)
on conflict (id) do nothing;

-- ===================================================================
-- avatars bucket — users manage their own avatar. Path contract:
-- avatars/{auth.uid()}/avatar.{png|jpg|webp}
-- ===================================================================
create policy "avatar_owner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===================================================================
-- logos bucket — Owner/Admin write, everyone reads (public bucket).
-- Path contract: logos/{company_id}/logo.{png|jpg|webp}
-- ===================================================================
create policy "logo_admin_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1]::uuid in (
      select company_id from company_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );

create policy "logo_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1]::uuid in (
      select company_id from company_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );

create policy "logo_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1]::uuid in (
      select company_id from company_members
       where user_id = auth.uid()
         and role in ('owner', 'admin')
    )
  );
