-- 040_trilingual_jobs.sql
-- Add per-locale columns for job title and description.
-- Existing `title` / `description` remain as the primary fallback.
-- `hard_requirements.label_en` is additive in JSONB — no schema change needed there.
--
-- Read strategy (enforced in app code, not DB):
--   title_<viewer_locale>  -> title_<company.default_locale>  -> title
--
-- Nullable + no backfill: existing jobs continue to work; HR can translate
-- on next edit (or via the "Translate this posting" flow later).

alter table job_postings
  add column if not exists title_ru text,
  add column if not exists title_uz text,
  add column if not exists title_en text,
  add column if not exists description_ru text,
  add column if not exists description_uz text,
  add column if not exists description_en text;

-- Light constraint: whenever any locale column is populated, it must be non-empty.
-- Empty strings defeat the fallback chain (they'd display as blank before falling through).
alter table job_postings
  add constraint job_postings_title_ru_nonempty
    check (title_ru is null or char_length(trim(title_ru)) > 0),
  add constraint job_postings_title_uz_nonempty
    check (title_uz is null or char_length(trim(title_uz)) > 0),
  add constraint job_postings_title_en_nonempty
    check (title_en is null or char_length(trim(title_en)) > 0),
  add constraint job_postings_description_ru_nonempty
    check (description_ru is null or char_length(trim(description_ru)) > 0),
  add constraint job_postings_description_uz_nonempty
    check (description_uz is null or char_length(trim(description_uz)) > 0),
  add constraint job_postings_description_en_nonempty
    check (description_en is null or char_length(trim(description_en)) > 0);

comment on column job_postings.title_ru is 'Russian title. Null = fall back to title_<company default> then title.';
comment on column job_postings.title_uz is 'Uzbek title. Null = fall back to title_<company default> then title.';
comment on column job_postings.title_en is 'English title. Null = fall back to title_<company default> then title.';
comment on column job_postings.description_ru is 'Russian description. Null = fallback chain.';
comment on column job_postings.description_uz is 'Uzbek description. Null = fallback chain.';
comment on column job_postings.description_en is 'English description. Null = fallback chain.';

-- Recreate the counts view to expose the new columns.
-- DROP first because Postgres rejects CREATE OR REPLACE VIEW when column positions
-- change (new locale columns are interleaved between existing ones).
drop view if exists job_postings_with_counts;
create view job_postings_with_counts as
select
  j.id,
  j.company_id,
  j.title,
  j.title_ru,
  j.title_uz,
  j.title_en,
  j.description,
  j.description_ru,
  j.description_uz,
  j.description_en,
  j.required_skills,
  j.hard_requirements,
  j.status,
  j.public_token,
  j.created_by,
  j.created_at,
  j.updated_at,
  count(c.id) filter (where c.status = 'analyzed')           as qualified_count,
  count(c.id) filter (where c.status = 'rejected_screening') as screened_out_count,
  count(c.id) filter (where c.status = 'analysis_failed')    as failed_count,
  count(c.id) filter (where c.status = 'invited')            as invited_count,
  count(c.id)                                                as total_count
from job_postings j
left join candidates c on c.job_posting_id = j.id
group by j.id;
