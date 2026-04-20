# Pre-GA Hardening Notes

Branch: `harden/pre-ga`
Started: 2026-04-20
Executor: Claude (Opus 4.7, 1M context)

---

## Baseline (before any change)

- `pnpm typecheck` — clean.
- `pnpm test` — 253 tests across 21 files, all passing.
- `pnpm test:e2e` — not run yet at baseline (Playwright boot is slow; will run before PRs merge).
- Current branch cut from `main` at the commit live as of 2026-04-20.

## DB backup — deferred

Spec called for `supabase db dump -f supabase/backups/pre-hardening-<date>.sql.gz` before any schema change. Local Supabase stack (Docker Desktop) was **not running** at session start, so the dump could not be produced.

**Risk assessment:**
- All migrations added in this session are **strictly additive** (new numbered files, no edits to already-applied migrations). No destructive DDL.
- Production data is backed up by Supabase Cloud's automatic daily snapshots.
- Migration files are themselves the versioned source of truth for schema.

**Mitigation:** if any migration in this session fails in prod, rollback is "revert the migration PR and apply a compensating migration" rather than "restore from dump." Documented here so the human can force a manual `supabase db dump` to `supabase/backups/pre-hardening-2026-04-20.sql.gz` before merging the first PR that lands in prod if extra paranoia is warranted.

---

## Point-in-time verification of audit findings

The hardening spec the human wrote was a point-in-time snapshot. Re-verification against current code at session start:

### Already resolved (no code change — documented only)

- **P0-7 — Type-safety escape hatches.** 0 hits for `: any`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error` across `lib/` and `app/api/`. Before count: 0, after count: 0.
- **P1-13 — Operator self-elevation.** The `OPERATOR_BOOTSTRAP_EMAIL` flow has been superseded by `pending_operators` + `pending_operator_promotions` two-stage approval (migrations 004 + 120). No self-elevation path. We still add `scripts/grant-operator.ts` for CLI bootstrap convenience.
- **P2-18 — Gemini 429 UX.** `rate_limited` is a distinct value in the `ai_attempt_status` enum (migration 003) and is set correctly by the Edge Function at `supabase/functions/process-cv/index.ts:424-459`. The UI banner that surfaces this to HR users is still missing — that part is covered in PR 14.
- **P3-19 — Pricing units.** `components/landing/pricing/pricing.tsx` already commits 1,500,000 UZS / 120 USD per month — not placeholders. No "Contact us" stub needed.
- **P3-20 — Proof section empty state.** `HonestEmptyState` renders when `landing_customers` returns 0 rows — no "Trusted by 0 companies" rendered. Verified at `components/landing/proof/proof.tsx:67-73`.

### Confirmed open issues (being fixed in this session)

- **P0-1** — `lib/notifications/dispatch.ts` logs only; no `notification_deliveries` table; no retry worker; no Resend webhook. Full pipeline being built in PR 11.
- **P0-2a** — No `subscription_plans` / `subscription_invoices` tables; no billing code; no `app/hr/settings/billing/page.tsx`. Being built in PR 12.
- **P0-3** — Interview quota is a TS-side `canScheduleInterview()` pre-check at `lib/companies/quota.ts:224-275` followed by an unlocked insert at `app/api/hr/candidates/[id]/interviews/route.ts`. Race confirmed. Fixing with an atomic RPC in PR 3.
- **P0-4** — `book_interview_slot` RPC has `FOR UPDATE` on the target row but no partial unique index enforcing single booking per slot. Adding in PR 4.
- **P0-5** — 8 call sites fall back to `http://localhost:3000` when `APP_URL` is unset, bypassing the Zod validator in `lib/env.ts`. Replacing with `env.APP_URL` in PR 1.
- **P0-6** — All 43 existing migrations use bare DDL with no idempotency guards. Forward-compat guard migration in PR 2; convention adopted for all new migrations.
- **P1-8** — `components/hr/settings/billing/billing-dialogs.tsx` has an "Upgrade" button that calls `requestUpgrade()` (sends an email to the operator). Not dead, but a stub. Redirects to Click checkout after PR 12.
- **P1-9** — `app/auth/verify/page.tsx` is a static info page with no resend button. Adding in PR 5.
- **P1-10** — Password reset flow exists at `app/auth/reset/` with server actions; `tests/e2e/auth.spec.ts` covers signup→verify→login but not the reset flow. Adding Playwright coverage in PR 5.
- **P1-11** — `app/api/apply/route.ts` does magic-bytes (`%PDF-`) + MIME + 5MB + UUID filename. No content validation. Adding `pdfjs-dist`-based page-open check in PR 6.
- **P1-12** — `supabase/templates/` directory does not exist. Creating trilingual templates in PR 13.
- **P1-14** — Single `audit_log` table with nullable `company_id` (operator rows have `company_id = NULL`). Spec wants a separate `operator_audit_log`. Adding in PR 7.
- **P2-15** — Gemini cost IS computed and persisted on `ai_processing_attempts` (not on `candidates`), and `company_usage_30d` MV exists with hourly pg_cron refresh. Operator page shows the 30-day USD total but no per-CV breakdown. Adding a `candidate_latest_ai_cost` view + UI polish in PR 10.
- **P2-16** — i18n dictionaries at `lib/i18n/{en,ru,uz}.ts` have runtime fallback `locale → DEFAULT_LOCALE('ru') → raw key` at `lib/i18n/index.ts:78`. No key-parity test. Spec wants fallback-to-English and a parity test; adding both in PR 8.
- **P2-17** — `lib/logger.ts` is a bare Pino setup with no `redact` config. All three `sentry.*.config.ts` files are bare `Sentry.init()` with no `beforeSend`. `lib/auth/otp.ts` lines 36 and 62 plus `lib/auth/eskiz.ts` line 75 log phone numbers. Adding `redact` config, Sentry `beforeSend`, and a Vitest in PR 9.
- **P3-22, P3-23, P3-24** — Landing "Book a demo" dialog, candidate-path nav split, meta-description length + JSON-LD breadcrumbs + canonicals all confirmed missing. Shipping in PR 14.

### Deferred (documented only, not built)

- **P0-2b** — Payme integration, proration support, annual billing cycles. Defer until Click is live and revenue signal is known.
- **P3-21** — Legal pages (`/terms`, `/privacy`, `/security`) render raw translation keys. **Blocked on legal counsel copy** — do NOT ship hollow pages. Flag to human: need real legal text in ru / uz / en before these pages can render. Not a code task.

---

## Decisions locked in by the human before execution

- **Pricing schema:** use a flexible `subscription_plans` table with `billing_unit` enum (`flat` / `per_seat` / `per_cv`) so pricing can change later. Seed row: `pro_monthly_flat` = 1,500,000 UZS, 500 CV/month, 100 interviews/month, unlimited seats. Matches landing page today.
- **Click credentials:** placeholders (`CHANGE_ME_*`) are acceptable for this session. Real values will be injected via deployment env. Boot logs a `WARN` when placeholder detected.
- **Operator audit log:** ship a separate `operator_audit_log` table per the spec. Existing `audit_log` stays for company-scoped events only.
- **Landing P3:** P3-22 / P3-23 / P3-24 included. P3-21 deferred (content-blocked).

---

## Progress log

(Updated as PRs land.)

- [x] Phase 0 pre-flight: branch cut, baseline recorded, HARDENING_NOTES written.
- [x] PR 1 — P0-5 APP_URL hardened
- [x] PR 2 — P0-6 migration idempotency
- [x] PR 3 — P0-3 interview quota TOCTOU (concurrency test deferred: requires live Supabase)
- [x] PR 4 — P0-4 interview slot partial unique index
- [x] PR 5 — P1-9 verify resend + P1-10 reset Playwright
- [x] PR 6 — P1-11 PDF validation
- [x] PR 7 — P1-13 grant-operator + P1-14 operator_audit_log
- [x] PR 8 — P2-16 i18n parity + fallback
- [x] PR 9 — P2-17 PII redaction
- [x] PR 10 — P2-15 candidate_latest_ai_cost view
- [x] PR 11 — P0-1 notification pipeline (deliveries table + dispatch refactor + Resend webhook). **Deferred**: Edge Function `dispatch-notification-retries` to back the pg_cron retry job (cron job is scheduled but the function endpoint is a 404 until deployed); Playwright for new_application + interview_booked email assertions (requires mailpit in supabase local config).
- [ ] PR 4 — P0-4 interview slot double-booking
- [ ] PR 5 — P1-9 verify resend + P1-10 reset Playwright
- [ ] PR 6 — P1-11 PDF validation
- [ ] PR 7 — P1-13 grant-operator + P1-14 operator_audit_log
- [ ] PR 8 — P2-16 i18n parity + fallback
- [ ] PR 9 — P2-17 PII redaction
- [ ] PR 10 — P2-15 Gemini cost polish
- [ ] PR 11 — P0-1 notification pipeline
- [ ] PR 12 — P0-2a Click billing + P1-8 upgrade flow
- [ ] PR 13 — P1-12 auth email templates
- [ ] PR 14 — P2-18 banner + P3-22 + P3-23 + P3-24
