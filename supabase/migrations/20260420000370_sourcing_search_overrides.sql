-- 370_sourcing_search_overrides.sql
-- Per-run user overrides for active sourcing: a free-text hh.uz keyword set and
-- an hh.uz region/area. The on/off source set already lives in
-- sourcing_searches.sources, so only the hh-specific knobs need a home here.
-- Shape: { "keywords": ["react", "frontend"], "area_id": "2759" }.
-- NULL / absent => zero-config defaults (keywords derive from the frozen
-- requirement_profile.search_keywords; area falls back to env HH_AREA_ID).
alter table sourcing_searches
  add column if not exists search_overrides jsonb;
