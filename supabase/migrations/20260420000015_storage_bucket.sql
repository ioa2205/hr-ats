-- 015_storage_bucket.sql
-- Private bucket for CV PDFs. 5MB per-file cap.
-- Paths are namespaced: cvs/{company_id}/{job_id}/{candidate_id}/cv.pdf
-- Storage RLS policies are defined in 020_rls_policies.sql.

insert into storage.buckets (id, name, public, file_size_limit)
values ('cvs', 'cvs', false, 5242880)
on conflict (id) do nothing;
