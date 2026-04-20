-- 023_quota_functions.sql
-- Phase 7: Quota enforcement helper functions.

-- === increment_cv_quota — atomically bump cv_quota_used for a company ===
create or replace function increment_cv_quota(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update subscriptions
     set cv_quota_used = cv_quota_used + 1,
         updated_at = now()
   where company_id = p_company_id;
end; $$;
