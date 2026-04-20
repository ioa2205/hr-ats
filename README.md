# HR ATS

Multi-tenant SaaS HR platform for the Uzbek market. Recruiters sign up, create a company, post jobs, and share a public link — Gemini 3.1 Pro screens each applicant's CV and ranks candidates by fit.

## Architecture

- **Next.js 16.2** (App Router, React 19, Turbopack dev / production `next start`)
- **Supabase** — Postgres + Auth + Storage + Realtime + Edge Functions
- **Google Gemini 3.1 Pro** — CV parsing and structured scoring
- **Railway** — app hosting (Amsterdam / `europe-west4` for latency to UZ)
- **Sentry** — error tracking for client, server, and edge

Three actors:
- **Candidate** — no account; submits via `/apply/<token>`.
- **HR user** — creates or joins a Company; manages jobs and candidates under `/hr/*`.
- **Operator** — platform super-admin (`profiles.is_operator = true`); monitors all tenants and impersonates users for support under `/operator/*`.

Tenancy: every row that belongs to a Company carries `company_id` and is isolated by RLS. HR users can belong to multiple Companies (freelance recruiters) and switch between them via `profiles.current_company_id`.

## Signup and authentication

New signups land on `/auth/signup`. Three methods:

1. **Email + password** — verification email is sent. Local Supabase auto-confirms; production requires the user to click the link.
2. **Google OAuth** — returns via `/auth/callback`. If the user's Google email matches an entry in `pending_operators`, they are elevated on first login.
3. **Phone OTP via Eskiz.uz** — SMS delivered through the Uzbek gateway. Flow: `/auth/signup-phone` → enter `+998XXXXXXXXX` → receive 6-digit code → verify → set email + password to complete the profile. Email is required even for phone signup (used for billing receipts and password recovery).

After signup the user lands on `/onboarding`:
- **Create company** — sets the user as owner, provisions a `subscriptions` row with a 14-day trial (50 CV analyses, 3 active jobs).
- **Join via invite code** — adds the user as a member (`admin` or `recruiter`) of an existing Company.

Trials are enforced by `lib/companies/quota.ts`. When a trial expires, the Company becomes read-only: all `/api/hr/*` mutations return `403 subscription_inactive` and `/hr/jobs/new` redirects to `/hr/settings/billing`. Read access remains unaffected. Billing (Click, Payme) is deferred to V_billing post-MVP.

## Commands

```bash
pnpm dev                # Dev server (Turbopack, port 3000)
pnpm build              # Production build
pnpm start              # Serve production build
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest unit tests (single run)
pnpm test:watch         # Vitest watch mode
pnpm test:e2e           # Playwright E2E (runs against `pnpm start` by default)
pnpm format             # Prettier auto-format
pnpm format:check       # Prettier check
```

E2E note: Playwright webServer defaults to `pnpm start` because Turbopack's on-demand compile in `pnpm dev` races with test navigation timeouts. Set `PLAYWRIGHT_DEV=1` to force the dev server when iterating on tests.

## Supabase

### Local development

```bash
supabase start                                              # Start local Supabase (Docker required)
supabase db reset                                            # Apply all migrations fresh
supabase gen types typescript --local > types/supabase.ts    # Regenerate types
supabase functions serve                                     # Serve Edge Functions locally
```

### Deployment (remote)

```bash
supabase link --project-ref <ref>
supabase db push                                              # Apply migrations to remote
supabase functions deploy process-cv --no-verify-jwt          # Deploy Edge Function
supabase secrets set GOOGLE_GEMINI_API_KEY=...                # Function secrets
supabase db dump -f backup.sql                                # Manual backup
```

### Realtime

Enabled on the `candidates` table; filtered per-company by RLS. Powers the live-updating applicant list in `/hr/jobs/<id>/applicants`.

### Cron

Migration `20260420000021_cron.sql` schedules four jobs (`pg_cron`):

| Schedule    | Job                     | Purpose                                       |
| ----------- | ----------------------- | --------------------------------------------- |
| every 2 min | `retry-pending-cvs`     | Retries `pending_analysis` rows (≤3 attempts) |
| hourly      | `refresh-storage-usage` | Refreshes `storage_usage` materialized view   |
| daily 03:00 | `orphan-cv-cleanup`     | Deletes PDFs with no matching candidate       |
| hourly :30  | `cleanup-rate-limits`   | Prunes expired rate limit rows                |

See `DEPLOYMENT.md` for production setup (env vars, operator bootstrap, Eskiz, OAuth, Sentry).

## Coding rules

Full project conventions live in [`CLAUDE.md`](./CLAUDE.md). Highlights:

1. No `any`, `@ts-ignore`, `TODO`, or `console.log` in app code — use `lib/logger.ts` with a context prefix.
2. Every Server Component that fetches data needs a `loading.tsx`; every dynamic route needs `not-found.tsx`.
3. API routes validate with Zod and return `{ error: string }` on failure — never stack traces.
4. All public strings go through `t('key', locale)` — locales: `ru`, `uz`, `en`.

## More

- **Build plan:** [`../Project-documentation/plan.md`](../Project-documentation/plan.md)
- **Operational runbook:** [`../Project-documentation/runbook.md`](../Project-documentation/runbook.md)
- **Deployment:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
