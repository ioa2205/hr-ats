-- 450_sourcing_cancel.sql
-- Adds a terminal 'canceled' state to sourcing searches so a recruiter can STOP
-- a queued/running search. Canceling also frees the per-posting in-flight slot
-- (the partial unique index only covers 'queued'/'running'), so a fresh search
-- can be started immediately. Deleting a search row is handled in app code
-- (DELETE route) and cascades to sourced_candidates.
alter type sourcing_status add value if not exists 'canceled';
