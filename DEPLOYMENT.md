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

| Schedule                 | Job                     | Purpose                                             |
| ------------------------ | ----------------------- | --------------------------------------------------- |
| every 2 min              | `retry-pending-cvs`     | Retries `pending_analysis` rows (max 3 attempts)    |
| hourly (`0 * * * *`)     | `refresh-storage-usage` | Refreshes the `storage_usage` materialized view     |
| daily 03:00 (`0 3 * * *`) | `orphan-cv-cleanup`     | Deletes storage objects with no matching candidate  |
| hourly (`30 * * * *`)    | `cleanup-rate-limits`   | Removes expired rate limit entries                  |

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

## 11. Migration idempotency convention

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
