-- 060_seed_telegram_invite_en.sql
-- Seed the English default for the invite-to-interview Telegram template.
-- Companies can override it in company_settings just like the RU/UZ defaults.

insert into platform_settings (key, value) values
  ('telegram_invite_en',
   E'Hello {name},\n\nWe''ve reviewed your application for the {position} role and would like to invite you to an interview.\n\nPlease share a time that works for you.')
on conflict (key) do nothing;
