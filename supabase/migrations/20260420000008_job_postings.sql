-- 008_job_postings.sql
-- Tenant-scoped. Every posting belongs to exactly one company.

create table job_postings (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  title             text not null check (char_length(title) between 3 and 200),
  description       text not null check (char_length(description) between 20 and 10000),
  required_skills   text[] not null default '{}',
  -- hard_requirements shape:
  -- [{ id:string, label_ru:string, label_uz:string,
  --    type:'boolean'|'number', min_value:number|null, order:number }]
  hard_requirements jsonb not null default '[]'::jsonb,
  status            job_status not null default 'active',
  public_token      text unique not null default encode(extensions.gen_random_bytes(12), 'hex'),
  -- nullable on purpose: if a member is removed their jobs show "Former member"
  -- but the FK is preserved for audit trail.
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_job_postings_company on job_postings(company_id);
create index idx_job_postings_company_status on job_postings(company_id, status);
create index idx_job_postings_public_token on job_postings(public_token);
