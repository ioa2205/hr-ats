-- 050_trilingual_analysis.sql
-- Add Uzbek + English copies of the Gemini analysis fields. The existing
-- columns (`one_line_summary`, `strengths`, `gaps`) continue to hold the
-- Russian analysis as the canonical / fallback value — no backfill.
--
-- Read strategy (app-side via pickLocalized):
--   viewer_locale = ru  → one_line_summary
--   viewer_locale = uz  → one_line_summary_uz  ?? one_line_summary
--   viewer_locale = en  → one_line_summary_en  ?? one_line_summary
--
-- Nullable, constrained non-empty: rows written before this migration
-- still render via the RU fallback.

alter table candidates
  add column if not exists one_line_summary_uz text,
  add column if not exists one_line_summary_en text,
  add column if not exists strengths_uz text[],
  add column if not exists strengths_en text[],
  add column if not exists gaps_uz text[],
  add column if not exists gaps_en text[];

alter table candidates
  add constraint candidates_summary_uz_nonempty
    check (one_line_summary_uz is null or char_length(trim(one_line_summary_uz)) > 0),
  add constraint candidates_summary_en_nonempty
    check (one_line_summary_en is null or char_length(trim(one_line_summary_en)) > 0);

comment on column candidates.one_line_summary_uz is 'Uzbek AI summary. Null = fall back to one_line_summary (Russian canonical).';
comment on column candidates.one_line_summary_en is 'English AI summary. Null = fall back to one_line_summary (Russian canonical).';
comment on column candidates.strengths_uz is 'Uzbek AI strengths. Null = fall back to strengths.';
comment on column candidates.strengths_en is 'English AI strengths. Null = fall back to strengths.';
comment on column candidates.gaps_uz is 'Uzbek AI gaps. Null = fall back to gaps.';
comment on column candidates.gaps_en is 'English AI gaps. Null = fall back to gaps.';
