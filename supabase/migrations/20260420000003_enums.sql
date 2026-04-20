-- 003_enums.sql

create type job_status as enum ('active', 'closed');

create type candidate_status as enum (
  'pending_analysis',
  'analyzing',
  'analyzed',
  'analysis_failed',
  'invited',
  'rejected',
  'rejected_screening'
);

create type detected_language as enum ('uz', 'ru', 'en', 'other');

create type ai_attempt_status as enum ('success', 'failed', 'timeout', 'rate_limited');

create type company_role as enum ('owner', 'admin', 'recruiter');

create type subscription_status as enum ('trialing', 'active', 'expired', 'cancelled');
