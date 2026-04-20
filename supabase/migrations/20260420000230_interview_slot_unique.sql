-- 230_interview_slot_unique.sql
-- P0-4: partial unique index preventing the same slot_id from being booked
-- by more than one interview_requests row.
--
-- Analysis: the existing book_interview_slot() RPC in migration 080 takes
-- SELECT ... FOR UPDATE on the target interview_requests row, which serializes
-- concurrent bookings of the same request. The slot_valid CTE also ensures
-- the requested slot belongs to that request (via interview_slots.request_id).
-- Together those mean cross-request slot reuse is not reachable through the
-- RPC. This index is defense-in-depth: if any future path ever writes to
-- interview_requests directly (bypassing the RPC) and sets booked_slot_id to
-- a slot already booked by another request, the write fails with SQLSTATE
-- 23505 (unique_violation) instead of silently double-booking.
--
-- The partial predicate ensures the index only applies to rows that are
-- currently booked; expired/declined/cancelled rows that share a booked_slot_id
-- (e.g. after a cancellation and re-book on the same slot) are unaffected.

create unique index if not exists ir_booked_slot_once
  on interview_requests (booked_slot_id)
  where status = 'booked' and booked_slot_id is not null;
