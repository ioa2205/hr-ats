# Supabase auth email templates

Version-controlled source for the templates that Supabase sends via its built-in auth mailer. Filename format: `<purpose>.<locale>.html`.

Supported purposes:

- `signup-confirm` — confirmation link after `auth.signUp`
- `reset-password` — recovery link from `auth.resetPasswordForEmail`
- `magic-link` — passwordless sign-in link
- `invite` — operator-side `auth.admin.inviteUserByEmail` (rarely used; HR invites go through our own Resend flow)

Supported locales: `en`, `ru`, `uz`.

## Variables Supabase injects at send time

All templates use the default set:

- `{{ .ConfirmationURL }}` — action link
- `{{ .Email }}` — recipient email
- `{{ .SiteURL }}` — configured SITE_URL (points to the app)
- `{{ .Token }}` / `{{ .TokenHash }}` — raw/hashed token (not embedded in these templates; kept inside ConfirmationURL)

## Upload checklist (manual, once per environment)

Supabase Management API doesn't expose template writes, so this is a dashboard step for each of staging and prod:

1. Dashboard → Authentication → Email Templates
2. For each template, set:
   - Sender name: **TezHR**
   - Reply-to: `support@tezhr.uz`
   - Subject: copy from the `<!-- subject: ... -->` comment at the top of each HTML file
   - Body: paste the corresponding HTML
3. Save. Verify by sending a test email from the "Send test email" button.
4. If you update a template here, re-paste it in the dashboard. Our CI does **not** push these automatically.

## Choosing the locale

Supabase doesn't natively pick per-user locales for email templates; it sends one template per endpoint. We configure all Supabase templates to **Russian** (the default market locale) and rely on our own Resend-powered trilingual pipeline for every other transactional email (invites, notifications, receipts). The `<locale>.html` variants here exist so whoever configures the dashboard has a reference for any future per-locale configuration or for manual A/B tests.
