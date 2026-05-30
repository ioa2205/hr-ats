# Deployment Guide

Target stack: **Railway** (EU-West / Amsterdam) + **Supabase Pro** (`eu-central-1`). This guide covers a first-time production deploy plus the parallel staging environment used for smoke testing.

> **Why Railway and not Vercel?** Both work. The app is host-agnostic: no `@vercel/*` SDKs, every API route sets `runtime = "nodejs"`, middleware runs on Node under `next start`, all scheduled work is inside Supabase `pg_cron`. If you later migrate to Vercel, only this section changes.

---

## 0. Pre-work outside the codebase

Lead time matters. Start these in parallel with any build-side work:

1. **Eskiz.uz** — register a business account at <https://eskiz.uz>, request API access. Verification takes 1–5 business days. Blocks phone-OTP signup in production. Without it, keep `ESKIZ_API_URL` pointing at the dev stub that logs OTPs to the server console.
2. **Google Cloud OAuth** — create project → enable OAuth consent screen (External, "Testing" while pre-launch) → create OAuth 2.0 Client ID → register callback URLs (`https://<domain>/auth/callback` + `http://localhost:3000/auth/callback` for dev). Copy the client ID/secret into Supabase Auth providers.
3. **Supabase** — one project for staging, one for production, both in `eu-central-1`. Paid tier from day one (500 MB DB free-tier headroom is tight once CVs start uploading).
4. **Sentry** — a single org with two projects (`hr-ats-staging`, `hr-ats-prod`). Grab each DSN.
5. **Cloudflare Turnstile** — one site widget per env, scoped to the corresponding domain.
6. **Railway account** — create two services (`hr-ats-staging`, `hr-ats-prod`) under one project, both in the Amsterdam region.
7. **Domain + DNS** — register the production domain (e.g., `hirly.uz`); DNS records are configured in §5 once Railway assigns the CNAME target.

---

## 1. Supabase setup (run for both staging and production)

### Project creation

- Supabase Dashboard → New project → `eu-central-1`.
- Copy from Settings → API: project URL, `anon` key, `service_role` key.

### Apply migrations

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Storage bucket

Dashboard → Storage → Create bucket `cvs` (**private**, max file size 5 MB). The migration-applied RLS policies restrict access to service_role; UI downloads always go through a signed URL from `/api/hr/candidates/:id/cv-url`.

### Realtime

Dashboard → Database → Replication → enable Realtime on the `candidates` table. Without this the live-updating applicant list stops working.

### Edge Function

```bash
supabase functions deploy process-cv --no-verify-jwt
supabase secrets set GOOGLE_GEMINI_API_KEY=<key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<same as project service_role>
```

### Auth providers

Dashboard → Authentication → Providers:
- **Email**: enable, require confirmation.
- **Google**: paste client ID + secret from the GCP OAuth credential.
- **Phone**: leave disabled — we handle phone OTP ourselves via Eskiz and `/api/auth/signup-phone/*`.

### Cron jobs (`pg_cron`)

Dashboard → Database → Extensions: confirm `pg_cron` and `pg_net` are enabled. Migration `20260420000021_cron.sql` schedules:

| Schedule                 | Job                       | Purpose                                                        |
| ------------------------ | ------------------------- | -------------------------------------------------------------- |
| every 2 min              | `retry-pending-cvs`       | Retries `pending_analysis` rows (max 3 attempts)               |
| hourly (`0 * * * *`)     | `refresh-storage-usage`   | Refreshes the `storage_usage` materialized view                |
| daily 03:00 (`0 3 * * *`) | `orphan-cv-cleanup`       | Deletes storage objects with no matching candidate             |
| hourly (`30 * * * *`)    | `cleanup-rate-limits`     | Removes expired rate limit entries                             |
| every 2 min              | `source-candidates-pickup` | Picks up queued / stale-running sourcing searches (migration `…000310`) → POSTs the worker route |
| daily 03:45 (`45 3 * * *`) | `purge-expired-sourcing`  | TTL-purges unpromoted `sourced_candidates` past `expires_at` + `sourcing_searches` > 90 days |

#### Required Postgres GUCs for the HTTP cron jobs

The `net.http_post` cron jobs (`retry-pending-cvs`, `dispatch-notification-retries`, `source-candidates-pickup`) read connection settings from database GUCs that **no migration sets** — provision them once per environment (Dashboard → SQL editor):

```sql
alter database postgres set app.settings.supabase_url    = 'https://<project-ref>.supabase.co';
alter database postgres set app.settings.service_role_key = '<service_role_key>';
-- NEW for active sourcing: the worker is a Next.js route on Railway, so the
-- pickup cron needs the app's public URL (no trailing slash).
alter database postgres set app.settings.app_url          = 'https://<your-app-host>';
```

Reconnect (or `select pg_reload_conf();`) after setting. If `app.settings.app_url` is unset, sourcing searches enqueue but the cron pickup silently no-ops (the immediate trigger kick still runs; only crash-recovery/backstop is affected).

### Seed the first operator

The first super-admin cannot self-provision — seed it via SQL before or right after they sign up:

**Option A — allow-list first, sign up second (preferred).** Set the `OPERATOR_BOOTSTRAP_EMAIL` env var (the migration seeds that email into `pending_operators` on first boot), then have the operator sign up normally. The `auto_elevate_operator` trigger flips `is_operator = true` when their email matches. For additional operators:

```sql
insert into pending_operators (email) values ('ops-two@example.com');
```

**Option B — elevate an existing user.**

```sql
update profiles set is_operator = true where email = 'ops-person@example.com';
```

The `trg_profiles_sync_operator_claim` trigger mirrors `is_operator` into `auth.users.raw_app_meta_data`, which Supabase surfaces as a JWT claim on the next token refresh. Users may need to sign out and back in to pick up the claim. Demote with `update profiles set is_operator = false where email = ...`.

---

## 2. Cloudflare Turnstile

- Create one widget per environment (staging + prod).
- Domain = the deployed hostname (e.g., `hirly.uz`).
- Copy **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and **Secret Key** → `TURNSTILE_SECRET_KEY`.

## 3. Sentry

- One Next.js project per environment.
- Copy the DSN from Project Settings → Client Keys.
- Set both `SENTRY_DSN` (server + edge) and `NEXT_PUBLIC_SENTRY_DSN` (browser) to the same value.
- Optional but recommended: set `SENTRY_ORG` and `SENTRY_PROJECT` so `withSentryConfig` uploads source maps at build time.

## 4. Eskiz.uz (phone OTP)

- `ESKIZ_API_URL` — usually `https://notify.eskiz.uz/api` in production; the dev-only stub is `http://localhost:3000/api/dev/eskiz` (logs OTP to the server console).
- `ESKIZ_API_KEY` — long-lived JWT from the Eskiz dashboard.
- `ESKIZ_SENDER_NAME` — registered alphanumeric sender ID (defaults to `4546`, the generic sender, while a branded one is pending approval).

The OTP code is stored hashed in `phone_otp_attempts`, with a max of 5 attempts per phone per hour enforced by the DB function. Expired codes are cleaned up by the hourly cron.

---

## 5. Railway deploy

### Link the repo

1. Railway Dashboard → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Railway auto-detects a Next.js app via Nixpacks: `pnpm install` → `pnpm build` → `pnpm start`. No Dockerfile or `railway.toml` required (a minimal one can be added later if you want pinned Node versions).
3. Create **two services** under the same project:
   - `hr-ats-staging` — watch branch `main` (or `staging` if you prefer a branch-per-env model).
   - `hr-ats-prod` — watch a tag pattern (e.g. `v*`) or deploy manually via the Railway CLI / dashboard.
4. In each service → **Settings** → **Regions** → `europe-west4` (Amsterdam). Closest EU region to Uzbekistan.
5. **Networking** → **Generate Domain** first (gives `<service>-production.up.railway.app`) to smoke-test, then add the custom domain.

Port: Railway injects `$PORT`; `next start` binds to it automatically since Next 14+. No extra flag needed.

Healthcheck: Railway defaults to polling the root `/`. Leave it — the home page (`app/page.tsx`) is a lightweight redirect to `/auth/login`, which is enough for a liveness signal.

### Environment variables

Set under each service → **Variables** tab. Point the staging service at the staging Supabase project and the production service at the production Supabase project.

| Variable                         | Notes                                                                     |
| -------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | `https://<project-ref>.supabase.co`                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase anon key                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`      | Service-role key — server-side only, **never** expose to browser          |
| `GOOGLE_GEMINI_API_KEY`          | Google AI Studio                                                          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key                                             |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstile secret                                               |
| `SENTRY_DSN`                     | Server/edge Sentry DSN                                                    |
| `NEXT_PUBLIC_SENTRY_DSN`         | Client Sentry DSN (same value as above)                                   |
| `SENTRY_ORG`                     | Optional — enables source-map upload at build time                        |
| `SENTRY_PROJECT`                 | Optional — enables source-map upload at build time                        |
| `APP_URL`                        | e.g., `https://hirly.uz` (used in apply links + emails)                   |
| `ESKIZ_API_KEY`                  | Long-lived JWT from Eskiz dashboard                                       |
| `ESKIZ_API_URL`                  | `https://notify.eskiz.uz/api`                                             |
| `ESKIZ_SENDER_NAME`              | Registered alphanumeric sender ID                                         |
| `OPERATOR_BOOTSTRAP_EMAIL`       | Seeds the first `pending_operators` row on boot                           |
| `NODE_ENV`                       | `production` — set by Railway automatically, listed here for awareness    |

> **Staging vs production:** one Supabase project per environment. Do not share service-role keys between staging and production.

### Deploy

- **First deploy.** Commit env vars → push to the watched branch → Railway builds and deploys automatically. Watch logs in the Railway dashboard.
- **Manual deploy from CLI** (optional):

  ```bash
  npm i -g @railway/cli
  railway login
  railway link            # choose project + service
  railway up              # uploads and triggers a fresh build
  ```

- **Promote staging → production.** Either merge to the production branch (if branch-based), or push a tag that the prod service watches, or use `railway environment production && railway up` from the CLI.

### Custom domain

1. Railway → service → **Settings** → **Networking** → **Custom Domain** → enter `hirly.uz` (or your domain).
2. Railway prints a CNAME target (typically `<something>.up.railway.app`). Add it to your DNS provider.
3. SSL certs are issued via Let's Encrypt automatically within a few minutes once DNS resolves.
4. Update `APP_URL` in the service's env vars to the custom domain **after** DNS + TLS are live.
5. Add the same domain to the Supabase project → **Authentication** → **URL Configuration** → **Site URL** and **Additional Redirect URLs** (`https://hirly.uz/auth/callback`).
6. Add the production URL to GCP OAuth → **Authorized redirect URIs** as `https://hirly.uz/auth/callback`.

### Logs and restarts

- Logs tail from the Railway dashboard or `railway logs --service hr-ats-prod`.
- Rolling restarts happen automatically on each deploy — no downtime if the healthcheck passes.
- Manual restart: dashboard → service → **Restart**.

### Analytics

Railway does not ship built-in Web Vitals analytics. Either (a) leave it off for MVP and rely on Sentry performance, or (b) drop in a privacy-friendly analytics script later (Plausible, Umami, Counter). None of these need env-var changes on the host.

---

## 6. Post-deploy smoke test

Walk through the full user journey on the staging URL before promoting:

1. **Signup (email)** — `/auth/signup`, fill form, confirm via magic link, land on `/onboarding`.
2. **Signup (Google)** — start signup, select Google, return to `/onboarding`.
3. **Signup (phone)** — `/auth/signup-phone`, enter `+998…`, receive SMS, verify, set email + password.
4. **Create company** — `/onboarding` → "Create company", land on `/hr/dashboard`.
5. **Invite teammate** — `/hr/settings/team` → send invite → open invite link in a private window → accept as a new user.
6. **Post a job** — `/hr/jobs/new`, add 2 skills and 2 hard requirements, create.
7. **Apply via public link** — open in private window, fill requirements + personal info, upload PDF.
8. **AI processes the CV** — back in admin, `/hr/jobs/<id>/applicants`, wait ≤ 2 minutes for status `analyzed` with a score.
9. **Trial expiry** — manually expire the subscription in SQL (see runbook), reload `/hr/jobs/new` → should redirect to `/hr/settings/billing` with a read-only banner.
10. **Operator panel + impersonation** — `/operator` as the seeded super-admin → suspend a tenant → verify HR side becomes read-only → reactivate → impersonate owner → verify red banner + audit row.

Expected end-to-end time from CV submission to "analyzed": under 3 minutes.

---

## 7. Telegram templates

- **Platform defaults** (operator-managed) at `/operator/templates`. Companies inherit automatically.
- **Company overrides** (Owner/Admin) at `/hr/settings/templates`. Saving replaces the platform default for that company only.
- Variables: `{name}`, `{position}`.

---

## 8. Rollback

### Application (Railway)

Railway → service → **Deployments** → find the last known-good deployment → **⋯** menu → **Redeploy**. A previous build image is re-pushed within seconds. If you need to pin rollback-ready artifacts, keep the last 5 builds retained in the service settings.

Alternative: revert the commit on the watched branch and push — Railway will build and deploy automatically.

### Database (Supabase)

Supabase → Database → Backups → pick a recovery point. Prefer restoring to a **new** project first to validate, then cut over DNS. Coordinate with application rollback so schema and app stay in sync.

### Revert a migration

```bash
supabase migration new revert_<migration_name>
# Edit the new file with the reversal SQL
supabase db push
```

---

## 9. Monitoring

| Service      | Where                                | Watch                                                                |
| ------------ | ------------------------------------ | -------------------------------------------------------------------- |
| **Sentry**   | [sentry.io](https://sentry.io)       | Unhandled errors, error rate spikes (> 1%), performance metrics      |
| **Railway**  | [railway.app](https://railway.app)   | Build status, deploy history, CPU/memory, container restarts, logs   |
| **Supabase** | [supabase.com](https://supabase.com) | DB health, Edge Function logs, storage size, Realtime connections    |

### Alerts to configure

- **Sentry:** new issue + error rate > 1% (5-min window).
- **Supabase:** Edge Function failure rate, connection pool saturation.
- **Railway:** enable email / Discord notifications for deploy failures and crash-loop restarts (Project → Settings → Integrations).

### Health probes

- `GET /api/operator/stats` returns 200 when DB + auth are healthy (requires `is_operator`).
- Public `/apply/<token>` is the user-facing entry point — failing here is a P0.

---

## 10. Production URL

- **Staging:** `<fill after first staging deploy>`
- **Production:** `<fill after go-live>`

(These are intentionally left blank until the deploy happens — update both lines as part of the go-live checklist.)

---

## 11. Supabase auth email templates (manual upload)

Source HTML lives in [`supabase/templates/`](supabase/templates/). Supabase's Management API doesn't expose template writes, so this is a **manual dashboard step** per environment (staging and prod both).

Per-environment checklist:

- [ ] Dashboard → Authentication → Email Templates → **Confirm signup**: paste `signup-confirm.<locale>.html`, subject from the `<!-- subject: -->` comment
- [ ] Dashboard → **Reset password**: paste `reset-password.<locale>.html`, subject likewise
- [ ] Dashboard → **Magic link**: paste `magic-link.<locale>.html`, subject likewise
- [ ] Dashboard → **Invite user**: paste `invite.<locale>.html`, subject likewise
- [ ] Project Settings → Auth → **Sender name**: `TezHR`
- [ ] Project Settings → Auth → **Reply-to**: `support@tezhr.uz`
- [ ] Send a test from each template; confirm the action link resolves to `{APP_URL}/auth/callback`

Supabase doesn't natively pick per-user locales for its built-in email sender. Configure Russian (primary market locale) and rely on our Resend pipeline for every other transactional email. Keep the ru/uz/en variants in-repo as reference for future per-locale rollouts.

Any template edit here must be re-pasted into the dashboard — there is no automation.

---

## 12. Click payments (billing)

Click is the primary Uzbek payment rail. The integration is a hosted-page redirect + webhook, so no SDK is required — `lib/billing/click.ts` handles URL construction and MD5 signature verification per Click's merchant spec.

### Required env vars

Set these in Railway **before** going live. Defaults are `CHANGE_ME_*` placeholders that fail the `/api/billing/checkout` route early with `click_not_configured` rather than letting users hit a broken Click page.

| Variable                 | Source (Click merchant cabinet)                     |
| ------------------------ | --------------------------------------------------- |
| `CLICK_MERCHANT_ID`      | Merchant → Settings → ID                            |
| `CLICK_SERVICE_ID`       | Merchant → Services → target service ID             |
| `CLICK_MERCHANT_USER_ID` | Merchant → Integrations → Merchant User ID          |
| `CLICK_SECRET_KEY`       | Merchant → Integrations → Secret key                |
| `CLICK_ENV`              | `sandbox` or `prod` (defaults to `sandbox`)         |

### Webhook

Configure the webhook URL in Click merchant cabinet as:
```
https://<your-domain>/api/webhooks/click
```

The endpoint handles both `action=0` (Prepare) and `action=1` (Complete) events. Idempotent on `click_trans_id` — Click's retries on the same transaction return the cached response without double-crediting.

### Flow

1. HR user clicks **Upgrade** in `/hr/settings/billing`.
2. Client POSTs `/api/billing/checkout` with `plan_code`. The route inserts a `pending` row in `subscription_invoices` and returns the Click hosted-page URL.
3. Browser redirects to Click. User completes payment.
4. Click POSTs the webhook twice (prepare, then complete). On `complete + error=0`:
   - `subscription_invoices.status` → `paid`
   - `subscriptions.status` → `active`, `plan_id` set, `current_period_end = now + 1 month`
5. User is redirected back to `/hr/settings/billing?invoice=<id>`.

### Deferred (P0-2b, out of scope for this round)

Payme integration, prorated upgrades mid-period, annual billing discount, and emailed receipts (the notification pipeline from P0-1 can carry the receipt but a trilingual receipt template is not yet committed).

---

## 13. Operator bootstrap and audit

### Initial operator seed

The first operator on a fresh environment is seeded via `scripts/grant-operator.ts`, not through the normal two-operator approval flow (which requires at least one existing operator).

```bash
# Source the env first (so NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)
set -a; source .env.local; set +a

pnpm tsx scripts/grant-operator.ts --email=founder@tezhr.uz --reason="initial seed"
```

What it does:
- Upserts `pending_operators(email, reason)` so any future signup with that email auto-elevates.
- If a profile for that email already exists, flips `is_operator=true` immediately. The user must log out and back in to refresh their JWT `is_operator` claim.
- Writes an `operator_audit_log` entry with `action='operator.grant.bootstrap'`.

After the initial seed, all further operator grants go through `/operator/users/{id}/promote` which requires a second operator to approve in the Inbox.

### Audit log separation

Operator actions (impersonation, suspend, resume, promotion approve/reject, bootstrap grant) write to `operator_audit_log` — separate from the company-scoped `audit_log`. `operator_audit_log` captures IP + user-agent on every write and is append-only (UPDATE/DELETE raise via trigger). Only operators can `SELECT` it; inserts are service-role only.

---

## 14. Migration idempotency convention

Adopted 2026-04-20 during the pre-GA hardening pass (see `HARDENING_NOTES.md`).

Every new migration under `supabase/migrations/` MUST use idempotent DDL so a partial re-apply or repeated `supabase db push` against the same state succeeds:

- `create table if not exists …`
- `create index if not exists …`
- `drop trigger if exists … on <table>;` then `create trigger …`
- `drop policy if exists … on <table>;` then `create policy …`
- `create or replace function …` (already idempotent)
- `create or replace view …`

`CREATE POLICY IF NOT EXISTS` is **not** supported by Postgres — always pair with `DROP POLICY IF EXISTS`.

**Do not edit applied migrations** to retrofit these guards. Migration `20260420000210_idempotency_guard.sql` re-declares the key triggers and asserts the existence of tenant-critical policies from migrations 019 / 020 as a belt-and-braces check. The original migrations stay untouched.

Verification after any migration change:

```bash
supabase db reset          # apply all migrations from scratch
supabase db push           # apply new migrations (no-op on a fresh reset)
supabase db reset          # run again — must still be clean
```

---

## 15. Active sourcing (outbound candidate search)

Migrations `20260420000310_active_sourcing.sql` (engine) and `20260420000320_sourcing_notifications.sql` (events). The funnel runs in a **Next.js background worker route** on Railway (not a Supabase Edge Function — it reuses `lib/gemini`, `lib/notifications`, and the tested `lib/sourcing` funnel directly; see `SOURCING_NOTES.md` for the rationale).

### Worker route

- `POST /api/internal/sourcing/run` — `runtime = "nodejs"`, `maxDuration = 300`. Runs the funnel in `after()` so the caller gets a fast `202`.
- **Auth:** the `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header (the same key Railway already has as `SUPABASE_SERVICE_ROLE_KEY`). No new secret.
- Invoked by the trigger's immediate kick (`/api/hr/jobs/[id]/source`) and, as a backstop / crash-recovery, by the `source-candidates-pickup` cron. The atomic `claim_sourcing_search` RPC ensures exactly one worker processes a search; a crashed run is re-claimed (stale > 10 min) and either resumes or, past 3 attempts, fails loudly with a quota refund + `sourcing_failed` notification.

### Quota config

Per-search metering (1 unit / "Find candidates" run):

```sql
-- Trial cap (default 2). Per company on the subscriptions row.
update subscriptions set sourcing_quota_limit = 2 where company_id = '<id>';
-- Pro monthly allotment (seeded 50). Runtime hard-enforces the trial counter
-- only today; the plan column is the source for monthly enforcement later.
update subscription_plans set sourcing_quota_monthly = 50 where code = 'pro_monthly_flat';
```

`try_consume_sourcing_quota(company, units)` (atomic, `FOR UPDATE`) is the gate; `refund_sourcing_quota` returns a unit on terminal failure.

### TTL purge

`purge_expired_sourcing()` (cron `purge-expired-sourcing`, daily 03:45) deletes unpromoted `sourced_candidates` past `expires_at` (default 30 days) and `sourcing_searches` older than 90 days, logging counts via `raise notice`. Promoted rows (`promoted_candidate_id` set) are never purged.

### Notifications

`sourcing_complete` / `sourcing_failed` fan out via `lib/notifications/dispatch.ts` (in-app + email; Telegram is a future channel — `dispatch` does not currently send Telegram). The email CTA deep-links to `/hr/jobs/<id>/sourcing/<searchId>`. Per-event toggles live in `notification_preferences` (`email_/inapp_sourcing_*`).

### Connectors

The `internal_pool` connector (the company's own past candidates) always runs — no creds. Additional sources plug into the `SourceConnector` interface (`lib/sourcing/types.ts`):

- **hh.uz (Phase 2) — BUILT, env-activated.** Set `HH_CLIENT_ID` + `HH_CLIENT_SECRET` and the connector (`lib/sourcing/connectors/hh/`) joins every search automatically; absent, sourcing is internal-pool-only. Optional: `HH_REFRESH_TOKEN` (one-time employer OAuth token — takes precedence if your access tier gates resume search behind an authorized employer; auto-refreshes), `HH_AREA_ID` (region filter — ids via `GET https://api.hh.ru/areas`), and overrides `HH_API_BASE_URL` / `HH_TOKEN_URL` / `HH_USER_AGENT` (sensible defaults). hh withholds names/contacts on unopened resumes (opening is paid on hh); sourced cards carry headline/experience/skills + a link to open on hh. **Confirm hh billing before pointing at prod hh.** See `SOURCING_RUNBOOK.md` §C1.
- **Telegram (Phase 3):** `TELEGRAM_BOT_TOKEN` + an explicit allow-list of job channels to ingest. Not yet built.
- **LinkedIn (Phase 4):** URL/paste only — no automated crawling, no creds. Not yet built.
