-- 001_drop_old_schema.sql
-- P1 destructive reset. Safe belt-and-suspenders: removes tables/views/functions/enums
-- that existed in the pre-multi-tenant schema. No-op on a fresh database.

drop materialized view if exists storage_usage cascade;
drop view if exists job_postings_with_counts cascade;
drop view if exists candidates_ranked cascade;

drop table if exists app_settings cascade;
drop table if exists audit_log cascade;
drop table if exists rate_limits cascade;
drop table if exists ai_processing_attempts cascade;
drop table if exists candidates cascade;
drop table if exists job_postings cascade;

drop function if exists get_storage_usage() cascade;
drop function if exists consume_rate_limit(text, int, int) cascade;
drop function if exists set_updated_at() cascade;

drop type if exists ai_attempt_status cascade;
drop type if exists detected_language cascade;
drop type if exists candidate_status cascade;
drop type if exists job_status cascade;
