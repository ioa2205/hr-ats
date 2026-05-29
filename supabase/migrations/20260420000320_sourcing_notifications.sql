-- 320_sourcing_notifications.sql
-- Register the sourcing_complete / sourcing_failed notification events.
--
-- ALTER TYPE ... ADD VALUE must not be USED in the same transaction it is added
-- in; this file only adds the values and the matching preference columns and
-- never references the new values, so it is txn-safe (mirrors how migration 300
-- added candidate_status 'unscored').

alter type notification_event_kind add value if not exists 'sourcing_complete';
alter type notification_event_kind add value if not exists 'sourcing_failed';

-- Dedicated per-event toggles so HR can mute sourcing notifications
-- independently. Default on, matching the other events.
alter table notification_preferences
  add column if not exists email_sourcing_complete boolean not null default true,
  add column if not exists email_sourcing_failed   boolean not null default true,
  add column if not exists inapp_sourcing_complete  boolean not null default true,
  add column if not exists inapp_sourcing_failed    boolean not null default true;
