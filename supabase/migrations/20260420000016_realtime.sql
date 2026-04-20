-- 016_realtime.sql
-- Enable Postgres logical replication for the candidates table so the HR portal
-- receives live updates. Per-tenant filtering happens through RLS on the subscription.

alter publication supabase_realtime add table candidates;
