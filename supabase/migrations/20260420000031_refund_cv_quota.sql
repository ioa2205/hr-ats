-- Refund a previously consumed CV quota slot.
--
-- Called by the process-cv edge function when Gemini processing fails
-- terminally (after retry exhaustion or a non-retryable error). Without this,
-- every failed analysis permanently burns a trial slot even though no result
-- was delivered to the HR user.
--
-- Idempotency: uses greatest(..., 0) so double-calls cannot drive the counter
-- negative. Pro plans (active) don't track consumed count, so we skip them.
create or replace function refund_cv_quota(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update subscriptions
     set cv_quota_used = greatest(cv_quota_used - 1, 0),
         updated_at = now()
   where company_id = p_company_id
     and status = 'trialing';
end; $$;
