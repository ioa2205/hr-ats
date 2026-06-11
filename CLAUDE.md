# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js 16.2 Warning

This project uses **Next.js 16.2**, which has breaking changes from earlier versions. Always consult `node_modules/next/dist/docs/` before writing any Next.js code — APIs, conventions, and file structure may differ from training data.

## Commands

```bash
pnpm dev                # Dev server (Turbopack, port 3000)
pnpm build              # Production build
pnpm start              # Serve production build (used by E2E)
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest unit tests (single run)
pnpm test:watch         # Vitest watch mode
pnpm test:e2e           # Playwright E2E (boots `pnpm start`; PLAYWRIGHT_DEV=1 to force dev)
pnpm format             # Prettier auto-format
pnpm format:check       # Prettier check
```

Supabase (requires Docker):

```bash
supabase start                       # Start local Supabase
supabase db reset                    # Apply all migrations fresh
supabase gen types typescript --local > types/supabase.ts  # Regenerate types
supabase functions serve             # Serve Edge Functions locally
```

CI runs: `typecheck → lint → test → build` on push/PR to main.

## Architecture

Multi-tenant SaaS HR ATS for the Uzbek market. Next.js frontend deployed on Railway (Amsterdam region), Supabase backend (Postgres, Auth, Storage, Realtime, Edge Functions), Google Gemini 3.1 Pro for AI resume screening. Tenants are Companies; every HR user belongs to one or more Companies with a role (Owner / Admin / Recruiter). Row-level security isolates data per Company.

### Three actors

- **Candidate** — no account. Submits via public `/apply/<token>` link. One-shot.
- **HR user** — signs up (email+password, Google OAuth, or phone OTP via Eskiz.uz), creates or joins a Company, manages jobs and reviews AI-ranked applicants under `/hr/*`.
- **Operator** — platform super-admin (`profiles.is_operator = true`). Monitors all tenants and impersonates users for support under `/operator/*`.

### Route groups

- `app/(hr)/` — HR portal (sidebar layout); every query scoped to `current_company_id`
- `app/(operator)/` — Super-admin portal; cross-tenant visibility; gated by `is_operator` JWT claim
- `app/auth/` — Login, signup (email / OAuth / phone), verify, reset, accept-invite
- `app/onboarding/` — Post-signup: create or join a Company
- `app/apply/[token]/` — Public candidate application form (token-gated, no auth)
- `app/api/` — API routes (auth, onboarding, company, hr, operator, apply)

### Tenancy model

- A user is always operating within exactly one Company at a time (`profiles.current_company_id`).
- Switching Companies updates `current_company_id` and reloads.
- Storage paths are namespaced: `cvs/{company_id}/{job_id}/{candidate_id}/cv.pdf`.
- RLS policies on every table join through `company_members` to confirm membership. Operator override is a separate policy checking the `is_operator` JWT claim.

### Key modules

- `lib/supabase/server.ts` — Server Component client (SSR with cookies)
- `lib/supabase/client.ts` — Browser client (lazy singleton)
- `lib/supabase/admin.ts` — Service role client (server-only, throws if imported in browser)
- `lib/supabase/middleware.ts` — Auth guard: redirects unauth'd `/hr` and `/operator`, redirects auth'd users with no Company to `/onboarding`, gates `/operator` by `is_operator`, redirects suspended-Company users to a friendly page
- `lib/auth/guards.ts` — `requireUser`, `requireCompanyAccess({ roles? })`, `requireOperator` (P2+)
- `lib/auth/eskiz.ts` — Eskiz.uz SMS client for phone OTP (P3)
- `lib/companies/current.ts` — `getCurrentCompany()` helper (reads cookie or profile) (P5)
- `lib/companies/quota.ts` — `canCreateJob`, `canProcessCv` trial-limit checks (P7)
- `lib/gemini/` — AI client, prompts (`SCREEN_RESUME`, `GENERATE_QUESTIONS`), Zod schemas for structured output
- `lib/validations/` — Zod schemas for jobs and candidates
- `lib/i18n/` — Russian (`ru`), Uzbek (`uz`), English (`en` — added in P9); per-user via `profiles.locale`, cookie fallback; `t(key, locale, vars)`
- `lib/logger.ts` — Pino structured logger (pretty-print in dev)
- `lib/utils.ts` — `cn()`, `formatPhone()`, `sanitize()`, `slugify()`
- `supabase/functions/process-cv/` — Deno Edge Function for AI CV processing

### Database

Supabase Postgres with **RLS policies per Company**. Core tenant-scoped tables: `companies`, `profiles`, `company_members`, `company_invites`, `subscriptions`, `job_postings`, `candidates`, `ai_processing_attempts`, `audit_log`, `company_settings`. Platform-wide tables: `platform_settings`, `pending_operators`, `phone_otp_attempts`, `impersonation_sessions`, `rate_limits`. Migrations in `supabase/migrations/`. Storage bucket `cvs` (private, 5MB limit), paths namespaced by `company_id`. Realtime enabled on `candidates` (filtered per-company by RLS).

**Operator JWT claim:** `profiles.is_operator = true` is synced into `auth.users.raw_app_meta_data` by trigger; Supabase surfaces it as a JWT claim that RLS checks. Initial operator is seeded via `pending_operators` allow-list — any new `auth.users` insert whose email matches a row in `pending_operators` gets auto-elevated on profile creation.

## Coding rules

1. **No `any`, `@ts-ignore`, `TODO`, `console.log`** — use `logger.info/warn/error` with a context prefix (e.g., `[apply]`, `[gemini]`, `[db]`)
2. **Every Server Component that fetches data** needs a `loading.tsx` skeleton matching the layout shape
3. **Every dynamic route** (`[id]`, `[token]`) needs `not-found.tsx` and calls `notFound()` when data is missing
4. **Every major section** needs `error.tsx` with recovery UI
5. **API routes** return `{ error: string }` on failure (never stack traces), validate input with Zod
6. **All public strings** go through `t('key')` — no hardcoded Russian, Uzbek, or English
7. **Tests ship with features** — Zod schema unit tests + at least one E2E happy path per phase
8. **Conventional commits** — `feat:`, `fix:`, `chore:`

## Styling

Tailwind CSS 4 with CSS-first `@theme` in `app/globals.css` — no `tailwind.config.js`. One unified **Tez Signal** visual system built on semantic role tokens only (`--color-canvas/surface*/text*/line*`, Tez Lapis `--color-primary*`, Persimmon `--color-accent*`, strict `--color-success/warning/danger/info*`); see `Project-documentation/DESIGN_SYSTEM.md`. The legacy Material and warm "Tez" token aliases were removed in Phase 11 — use semantic roles, never hardcoded brand color. Shared primitives live in `components/ui` (Radix-based). Fonts: Manrope Variable (sans/brand) + JetBrains Mono (data only).

## Environment variables

See `.env.local.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `APP_URL`, `ESKIZ_API_KEY`, `ESKIZ_API_URL`, `ESKIZ_SENDER_NAME`, `OPERATOR_BOOTSTRAP_EMAIL`. Optional: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.



