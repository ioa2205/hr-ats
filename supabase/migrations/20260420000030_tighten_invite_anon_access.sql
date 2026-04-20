-- Remove the anon SELECT policy on company_invites.
--
-- The old policy granted `to anon` select on all pending, non-expired invites
-- without any token predicate, which allowed an unauthenticated client to
-- enumerate every pending invite's email, role, and company_id across every
-- tenant. The invite lookup is already performed server-side with the service
-- role client in app/auth/accept-invite/[token]/page.tsx and in
-- app/api/onboarding/accept-invite/route.ts, so no anon access is required.

drop policy if exists company_invites_public_token_read on company_invites;
