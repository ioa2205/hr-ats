-- 022_seed_platform_settings.sql
-- Operator-default Telegram templates (companies can override in company_settings)
-- and the bootstrap operator allow-list row.

insert into platform_settings (key, value) values
  ('telegram_invite_ru',
   E'Здравствуйте, {name}!\n\nМы рассмотрели вашу заявку на позицию «{position}» и хотели бы пригласить вас на собеседование.\n\nПожалуйста, напишите удобное для вас время.'),
  ('telegram_invite_uz',
   E'Assalomu alaykum, {name}!\n\nSiz «{position}» lavozimiga yuborgan arizangizni ko''rib chiqdik va sizni suhbatga taklif qilmoqchimiz.\n\nIltimos, qulay vaqtingizni yozing.')
on conflict (key) do nothing;

-- Seed the operator bootstrap allow-list. Any auth.users row created with a
-- matching email will be auto-elevated to is_operator=true on profile creation
-- (see auto_elevate_operator in migration 018 + trigger in 019).
insert into pending_operators (email, reason) values
  ('ioa22052005@gmail.com', 'P1 bootstrap operator')
on conflict (email) do nothing;
