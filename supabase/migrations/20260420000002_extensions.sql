-- 002_extensions.sql
-- Required extensions for the multi-tenant schema.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "pg_cron";
create extension if not exists "pg_net" with schema extensions;
