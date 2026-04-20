-- 007_phone_otp.sql
-- Phone OTP verification state for Eskiz.uz signup flow.
-- Codes are hashed (never stored in plaintext) and expire within minutes.

create table phone_otp_attempts (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  attempts    smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_phone_otp_phone on phone_otp_attempts(phone, created_at desc);
