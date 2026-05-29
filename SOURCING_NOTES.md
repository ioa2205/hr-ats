# SOURCING_NOTES.md — Active Sourcing pre-flight (Phase 0)

**Feature:** outbound candidate sourcing for TezHR (`feat/active-sourcing`).
**Pre-flight date:** 2026-05-29. **Branch:** `feat/active-sourcing` (off `main`).

This file is the Phase 0 deliverable required before any code change: it records the
baseline, re-verifies the "already exists" reuse contract against current source
(every claim cited to `file:line`), and lists everything that **drifted** from the spec
plus **new constraints** the builder must respect. Findings were produced by an 8-reader
verification fan-out + synthesis over the live tree.

---

## Baseline (Phase 0.1)

- `pnpm typecheck` → **clean** (exit 0, `tsc --noEmit`).
- `pnpm test` → **green**: 25 test files, 282 tests passing (vitest 4.1.4), ~17.6s.
- Recorded before any change on `feat/active-sourcing`. This is the bar every phase must hold.

---

## Confirmed

### job_postings
- Columns: `title text not null check(char_length 3..200)`, `description text not null check(20..10000)`, `required_skills text[] not null default '{}'`, `hard_requirements jsonb not null default '[]'::jsonb`; `status job_status default 'active'`. — `supabase/migrations/20260420000008_job_postings.sql:4-21`
- `hard_requirements` JSONB element shape (snake_case, includes `order`): `{ id:string, label_ru:string, label_uz:string, type:'boolean'|'number', min_value:number|null, order:number }`, documented verbatim in the migration comment. — `supabase/migrations/20260420000008_job_postings.sql:10-13`
- App-layer validation `hardRequirementSchema`: `id z.string().min(1)`, `label_ru/label_uz z.string().min(1)`, `label_en z.string().optional()`, `type z.enum(['boolean','number'])`, `min_value z.number().nullable()`, `order z.number().int().nonnegative()`. `min_value` is nullable (required, may be null); `order` and `id` are required. — `lib/validations/job.ts:3-11`
- Canonical write schema `jobPostingSchema`: `title(3..200)`, `description(20..10000)`, `required_skills` (default `[]`), `hard_requirements` (array of `hardRequirementSchema`, default `[]`), `status z.enum(['active','closed']).default('active')`, plus optional `title_/description_{ru,uz,en}` locale fields. Exports `JobPostingInput` / `HardRequirementInput`. — `lib/validations/job.ts:19-34`
- Domain type `HardRequirement { id; label_ru; label_uz; label_en?; type:'boolean'|'number'; min_value:number|null; order }`; `RequirementSnapshot = HardRequirement[]`. — `types/index.ts:38-52`
- HR create-job route parses body with `jobPostingSchema.safeParse`, runs `hard_requirements` through `fillMissingLocales` (Gemini), then inserts via the service-role admin client. — `app/api/hr/jobs/route.ts:19-72`
- AI drafting shapes `jobDraftJsonSchema` + `JobDraftZod` (max 8 items) emit `label_ru/label_uz/label_en/type/min_value`; `buildJobDraftPrompt` instructs Gemini to produce binary/numeric self-declare gates. — `lib/gemini/job-draft.ts:23-71`

### candidates
- Migration 300 adds `requirements_responses jsonb`, `requirements_snapshot jsonb`, `meets_requirements boolean` (all nullable, no defaults). Comments: `requirements_responses` = req_id→raw answer string; `requirements_snapshot` = frozen copy of `job_postings.hard_requirements`; `meets_requirements` = true/false/null (null when job had no hard requirements). — `supabase/migrations/20260420000300_candidate_requirements_evaluation.sql:13-23`
- TS shapes: `RequirementResponses = Record<string,string>`; `RequirementSnapshot = HardRequirement[]`; `meets_requirements boolean|null`. Both jsonb cols are `Json|null` in generated types. — `types/index.ts:48-52`; `types/supabase.ts:179-182`
- `candidate_status` enum created in `20260420000003_enums.sql` (`pending_analysis, analyzing, analyzed, analysis_failed, invited, rejected, rejected_screening`) and extended with `unscored` via `alter type ... add value if not exists` in migration 300 — 8 values total. — `supabase/migrations/20260420000003_enums.sql:5-13`; `supabase/migrations/20260420000300_candidate_requirements_evaluation.sql:11`
- `unscored` is reflected in the generated `Enums.candidate_status` union and the runtime `Constants` array. — `types/supabase.ts:1139-1147, 1300-1309`
- Candidate insert (apply route) shape: `baseFields = { id (crypto.randomUUID()), job_posting_id, full_name (trimmed), phone_number, cv_storage_path, requirements_responses, requirements_snapshot, meets_requirements }`; `status` per branch is `unscored`, `rejected_screening` (+ `ai_error:'quota_exceeded'`), or `pending_analysis`. Insert uses `createAdminClient` (bypasses RLS). — `app/api/apply/route.ts:156-254`
- Base DDL: NOT NULL with no default = `full_name`, `phone_number`, `job_posting_id`; NOT NULL with default = `id (gen_random_uuid())`, `status (default 'pending_analysis')`, `retry_count (0, check <=5)`, `created_at/updated_at (now())`. `phone_number` CHECK `~ '^\+998\d{9}$'`; `match_score` CHECK 0..100; `cv_storage_path` nullable; `job_posting_id` FK → `job_postings(id)` ON DELETE CASCADE. No `company_id` column. — `supabase/migrations/20260420000009_candidates.sql:5-23`
- Realtime enabled via `alter publication supabase_realtime add table candidates`; per-tenant filtering delegated to RLS on the subscription. — `supabase/migrations/20260420000016_realtime.sql:1-5`

### gemini + cost
- `callGeminiFlashJson(opts: FlashCallOpts): Promise<{ text; durationMs }>`; `FlashCallOpts = { systemInstruction; userPrompt; responseSchema: object; temperature?; maxOutputTokens? }`. Returns raw JSON string; caller does JSON.parse + Zod. Defaults: temperature 0.3, maxOutputTokens 4096. **Flash returns NO token counts.** — `lib/gemini/call-flash.ts:3-36`
- `callGeminiProJson(opts: ProCallOpts): Promise<ProCallResult>`; `ProCallResult = { text; durationMs; promptTokens:number|null; outputTokens:number|null }`, sourced from `result.usageMetadata` (`promptTokenCount`→`promptTokens`, `candidatesTokenCount`→`outputTokens`). **Only Pro returns tokens.** — `lib/gemini/call-pro.ts:3-49`
- Structured output enforced via `responseMimeType:"application/json"` + `responseSchema` (plain JSON-Schema object, **NOT Zod**) in the generateContent config. — `lib/gemini/call-pro.ts:27-37`
- `getGeminiClient()` lazy singleton `new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! })`; exports `ai`, `MODEL = "gemini-3.1-pro-preview"`, `MODEL_FLASH = "gemini-3-flash-preview"`, pricing constants. — `lib/gemini/client.ts:1-31`
- Schema convention: paired `as const` JSON-Schema object + mirrored `z.object` + `z.infer` type; Zod imported from `"zod/v4"`. **No central registry.** — `lib/gemini/schema.ts:1-89`
- Prompt convention: `build*Prompt()` functions returning the system-instruction string, with `toneInstruction(tone)` appended. `buildCvAnalysisPrompt(posting, tone='neutral')`, `JobPostingForPrompt = { title; description; required_skills }`. — `lib/gemini/prompts.ts:1-58`
- End-to-end Pro caller: `generateInterviewQuestions` calls `callGeminiProJson({ responseSchema, temperature:0.4, maxOutputTokens:4096 })`, JSON.parses (`interview_questions_invalid_json`), validates (`interview_questions_schema_mismatch`), computes cost; the route inserts into `ai_processing_attempts`. — `lib/gemini/interview-questions.ts:165-210`; `app/api/hr/candidates/[id]/interview-questions/route.ts:91-145`
- End-to-end Flash caller: `POST /api/hr/jobs/ai-draft` uses `callGeminiFlashJson(...)`, then JSON.parse (502 `ai_parse_failed`), then `JobDraftZod.safeParse` (502 `ai_schema_mismatch`). Flash path records NO token usage / no `ai_processing_attempts` row. — `app/api/hr/jobs/ai-draft/route.ts:43-78`
- `calcCost(promptTokens: number, outputTokens: number): number` = `(promptTokens*INPUT_USD_PER_MTOK + outputTokens*OUTPUT_USD_PER_MTOK)/1_000_000`; takes raw token COUNTS (first=prompt/input, second=output). — `lib/gemini/cost.ts:3-6`
- Pricing constants live in `client.ts`: `INPUT_USD_PER_MTOK=2.0`, `OUTPUT_USD_PER_MTOK=12.0` (Pro, used by `calcCost`); `INPUT_USD_PER_MTOK_FLASH=0.15`, `OUTPUT_USD_PER_MTOK_FLASH=0.6` (telemetry only, not enforced). — `lib/gemini/client.ts:25-31`
- `ai_processing_attempts` columns: `candidate_id uuid not null`, `company_id uuid`, `status ai_attempt_status not null`, `model text not null`, `prompt_tokens integer`, `output_tokens integer`, `duration_ms integer`, `cost_usd numeric(10,6)`, `error text`. **No `input_tokens` column.** — `supabase/migrations/20260420000010_ai_attempts.sql:5-17`
- `candidate_latest_ai_cost` view (migration 250) exposes latest attempt per candidate: `prompt_tokens, output_tokens, duration_ms, cost_usd, model, attempt_status, analyzed_at`; granted to `service_role` only, no RLS. — `supabase/migrations/20260420000250_candidate_cost_view.sql:10-35`

### notifications
- `dispatchNotification(input: DispatchInput): Promise<void>` is the event fan-out API; `event` is the DB enum `notification_event_kind`. `DispatchInput = { companyId, event, title, body?, entityType?, entityId?, metadata?, userIds? }`. — `lib/notifications/dispatch.ts:10-22, 61`
- Fan-out is exactly two channels: in-app (`notifications` table + Realtime) and email (Resend), gated by per-(user,company) `notification_preferences` (`emailColumn[event]`/`inappColumn[event]`, default true if no prefs row) and quiet hours; suppressed addresses (`notification_suppressions`) log a `suppressed` delivery row and skip. Quiet-hours emails are queued; live sends go `sending`→`sent`/`failed`. — `lib/notifications/dispatch.ts:24-40, 114-224`
- `isWithinQuietHours(hour, start, end)` and `hourOf(date)` are pure helpers (handle same-day + midnight-wrap; false when either bound null or start===end). — `lib/notifications/quiet-hours.ts:10-24`
- `notification_delivery_status` enum = `('queued','sending','sent','failed','bounced','suppressed')`; `notification_deliveries` columns include `status, attempts, last_error, next_retry_at, resend_message_id, event`. RLS: operators read all, members read own company, only `service_role` may insert/update. — `supabase/migrations/20260420000260_notification_deliveries.sql:9-77`
- Retry pickup is a pg_cron job (every minute) doing `net.http_post` to `/functions/v1/dispatch-notification-retries`; back-off computed in TS via `computeNextRetryAt(attempt, base)` → 1m/5m/30m. — `supabase/migrations/20260420000260_notification_deliveries.sql:44-126`; `lib/notifications/dispatch.ts:234-238`
- Resend webhook drives status transitions: `email.bounced`→`bounced`, `email.complained`→`suppressed` (+ upsert into `notification_suppressions`), `email.delivered`→`sent`. — `app/api/webhooks/resend/route.ts:76-114`
- `notification_event_kind` enum (single source of truth) = `('new_application','top_pick','interview_booked','interview_declined','ai_failed','quota_warning')`, mirrored in generated types. — `supabase/migrations/20260420000090_notification_preferences.sql:49-56`; `types/supabase.ts:1164-1170, 1314-1321`
- `renderNotificationEmail(event, input)` maps each event to `notifications.email.subject_<event>` via `SUBJECT_KEYS`; trilingual subject keys + `open_cta`/`footer` exist in ru/uz/en and the `TranslationKey` union. — `lib/email/templates/notification.ts:23-30`; `lib/i18n/{en,ru,uz}.ts`; `lib/i18n/types.ts:381-386`

### edge worker (process-cv) — the template the sourcing worker mirrors
- Single flat `index.ts` with a bottom `Deno.serve(async (req) => {...})`; helpers and schemas inlined above it. Imports use Deno `npm:` specifiers (`npm:@google/genai`, `npm:@supabase/supabase-js@2`, `npm:zod/v4`) + `../_shared/cors.ts`. — `supabase/functions/process-cv/index.ts:5-8, 219-524`
- Request contract: caller passes ONLY `{ candidateId: uuid }`, validated by `RequestBody = z.object({ candidateId: z.string().uuid() })`; everything else is read from the DB. — `supabase/functions/process-cv/index.ts:97-99, 226-237`
- Auth = service role; builds an admin client from `Deno.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_GEMINI_API_KEY`); JWT verification disabled at deploy via `--no-verify-jwt` (no `[functions]` block in `config.toml`). — `supabase/functions/process-cv/index.ts:240-246`; `README.md:67`; `DEPLOYMENT.md:48`
- Invoked from Next.js routes via `admin.functions.invoke("process-cv", { body: { candidateId } })` inside `after(...)` (fire-and-forget), and from pg_cron `retry-pending-cvs` (every 2 min) via `net.http_post` for `status='pending_analysis' and retry_count<3 and updated_at < now()-'2 minutes' limit 20`. — `app/api/apply/route.ts:256-264`; `app/api/hr/candidates/[id]/retry/route.ts:53-64`; `app/api/hr/candidates/[id]/analyze-anyway/route.ts:63-74`; `supabase/migrations/20260420000021_cron.sql:6-26`
- `_shared/` contains only `cors.ts` (`corsHeaders`). No shared admin client / Gemini wrapper / logger. — `supabase/functions/_shared/cors.ts:1-5`
- Gemini is called via an inlined Deno copy (`new GoogleGenAI` from `npm:@google/genai`); MODEL string, pricing, JSON schema, and `toneInstruction` are duplicated inline (comment: "kept inline so the Deno Edge Function doesn't need to bundle the Next.js module graph"). — `supabase/functions/process-cv/index.ts:5, 13-19, 116-119, 247, 335-359`
- Atomic claim: `update candidates set status='analyzing' .in('status',['pending_analysis','analysis_failed']).eq('id',candidateId).select('*').single()`; if no row claimed → 200 `{ok:true,skipped:true}`. Success → `analyzed` + scores + clear `ai_error` + insert `success` attempt; rate-limited → reset to `pending_analysis`, `ai_error='rate_limited'`, no retry bump; timeout/general → `analysis_failed`, `ai_error`, `retry_count+1`, insert matching attempt. — `supabase/functions/process-cv/index.ts:250-263, 382-413, 416-502`
- On terminal failure (`!isRateLimited && companyId && retryCount>=3`) it calls `refund_cv_quota(p_company_id)` (security definer; decrements `cv_quota_used` via `greatest(...-1,0)` only for `status='trialing'`). — `supabase/functions/process-cv/index.ts:508-517`; `supabase/migrations/20260420000031_refund_cv_quota.sql:10-22`

### quota / billing — the RPC pattern the sourcing quota mirrors
- `try_consume_cv_quota(p_company_id uuid) returns boolean`, `language plpgsql security definer set search_path = public`. Locks the subscriptions row `FOR UPDATE`; returns false if not found; returns true with NO bump if `status='active'`; if `status='trialing' AND trial_ends_at > now() AND cv_quota_used < cv_quota_limit` it bumps `cv_quota_used+1` and returns true; else false. — `supabase/migrations/20260420000024_p7_quota_atomic.sql:8-45`
- `book_interview_request(...) returns jsonb` mirrors migration 024's lock pattern but returns a jsonb result object (`{ok, error, used, limit}`); trial cap `v_limit int := 3` is hardcoded, counted via `count(*)` over `interview_requests` (status='booked', last 30 days) inside the lock. Ends with explicit `grant execute ... to authenticated, service_role`. — `supabase/migrations/20260420000220_interview_quota_atomic.sql:16-115, 117-119`
- `subscriptions` table holds trial counters: `company_id uuid pk`, `status subscription_status default 'trialing'`, `trial_ends_at (now()+14 days)`, `cv_quota_used int default 0`, `cv_quota_limit int default 50`, `job_quota_limit int default 3`, `pro_started_at`, `pro_renews_at`, `updated_at`. — `supabase/migrations/20260420000006_subscriptions.sql:4-14`
- `subscription_plans` (migration 270) has `cv_quota_monthly`, `interview_quota_monthly`, `seats_included`; seed `pro_monthly_flat` = `cv_quota_monthly=500, interview_quota_monthly=100`. Billing also ALTERs `subscriptions` to add `plan_id`, `current_period_end`, `grace_period_ends_at`. — `supabase/migrations/20260420000270_billing.sql:25-65`
- TS call shapes: `incrementCvQuota(companyId)` → `admin.rpc("try_consume_cv_quota", { p_company_id })`, returns `data === true`. `book_interview_request` → `admin.rpc("book_interview_request", { p_company_id, ... })`, result cast to `BookInterviewResult | null`, error codes mapped to HTTP (402 etc.). — `lib/companies/quota.ts:132-139`; `app/api/hr/candidates/[id]/interviews/route.ts:62-99`
- TS predicate layer: `QuotaReason` union + `isWritable(status, trialEndMs, nowMs)` gate (`active`→true; `trialing`→trialEnd>now; else false), paired read-only predicates (`canProcessCv`, etc.) alongside atomic wrappers. — `lib/companies/quota.ts:5-11, 104-139, 277-281`

### cron / i18n / RLS
- Extensions: `pgcrypto`, `pg_trgm`, `pg_cron`, `pg_net` (into `extensions` schema, used for `net.http_post`). — `supabase/migrations/20260420000002_extensions.sql:4-7`
- Worker-pickup cron pattern (notification retries): idempotent `do$$ ... perform cron.unschedule(name); exception when others then null; end$$;` then `cron.schedule(name, '* * * * *', $$ ... net.http_post(...) $$)`. — `supabase/migrations/20260420000260_notification_deliveries.sql:106-126`
- Pure-SQL TTL purge crons: `cleanup-rate-limits` (`delete from rate_limits where expires_at < now()`), `cleanup-expired-invites`, `cleanup-expired-otps`, nightly `cv-retention`. — `supabase/migrations/20260420000021_cron.sql:28-33, 103-112`
- HTTP crons read `current_setting('app.settings.supabase_url')` and `current_setting('app.settings.service_role_key')` (DB GUCs). — `supabase/migrations/20260420000021_cron.sql:13-16`; `supabase/migrations/20260420000260_notification_deliveries.sql:118-122`
- `t(key: TranslationKey, locale: Locale, vars?: Record<string,string>): string`; fallback chain locale→en→raw key; `{name}` token interpolation. — `lib/i18n/index.ts:82-92`
- Catalogs are TS files (`lib/i18n/{ru,uz,en}.ts`, each `export const <locale>: Translations = {...}`); keys are flat dotted-string literals (`common.*`, `hr.*`, ...) in the `TranslationKey` union. `Translations = Record<TranslationKey, string>` enforces exhaustiveness. — `lib/i18n/index.ts:3-12`; `lib/i18n/types.ts:3-9, 2020`
- RLS helper `user_companies() returns setof uuid` (`language sql security definer stable set search_path = public`, `select company_id from company_members where user_id = auth.uid()`). — `supabase/migrations/20260420000018_functions.sql:50-58`
- `job_postings` RLS to copy verbatim: `jobs_member_all for all using (company_id in (select user_companies()))`; `jobs_public_token_read for select to anon using (status='active')`; `jobs_operator_read for select using ((auth.jwt() ->> 'is_operator')::boolean = true)`. — `supabase/migrations/20260420000020_rls_policies.sql:141-149`

---

## Drifted / renamed / partial

### job_postings
- **Claimed:** `types/supabase.ts` gives `hard_requirements` a structured Row type. **Actual:** it is plain `Json` (`Json|null` on the `job_postings_with_counts` view) — the DB enforces NO shape; only Zod (`lib/validations/job.ts`) and the domain interface do. — `types/supabase.ts:489, 508, 527, 965`
- **Claimed:** the entry has only `{ id, label_ru, label_uz, type, min_value, order }`. **Actual:** there is an ADDITIONAL optional `label_en` (in `hardRequirementSchema` and `HardRequirement`), additive in JSONB (no schema change); the builder must carry `label_en` through. — `lib/validations/job.ts:7`; `types/index.ts:42`; `supabase/migrations/20260420000040_trilingual_jobs.sql:4`
- **Claimed:** the Gemini job-draft requirement shape matches the persisted shape (has `id`/`order`). **Actual:** the AI-facing shapes (`jobDraftJsonSchema`, `JobDraftZod`, `fillMissingLocales` `PostingFields`) DO NOT include `id` or `order`, and `min_value` is optional there. `id` (`crypto.randomUUID()`) + `order` (index) are assigned client-side in the job form before save; AI output is NOT directly save-ready against `jobPostingSchema`. — `lib/gemini/job-draft.ts:23-71`; `lib/gemini/translate-posting.ts:18-25`; `components/hr/job-form.tsx:133-141`

### candidates
- **Claimed:** candidates columns match migration 009 only. **Actual:** the live Row has many later-added columns absent from 009: `ai_interview_questions` (070), `one_line_summary_en/_uz`, `strengths_en/_uz`, `gaps_en/_uz` (050), plus the three requirement columns (300). A promote insert only needs the NOT-NULL base columns; do not assume 009 is the full shape. — `supabase/migrations/20260420000009_candidates.sql:5-23` vs `types/supabase.ts:160-189`

### gemini + cost
- **Claimed:** `lib/gemini/` exports prompts named `SCREEN_RESUME` / `GENERATE_QUESTIONS` (per CLAUDE.md). **Actual:** no such identifiers exist; actual exports are builder functions `buildCvAnalysisPrompt` and `buildInterviewQuestionsPrompt`. New prompts should be `build*Prompt()`, **not SCREAMING_CASE**. — `lib/gemini/prompts.ts:16`; `lib/gemini/interview-questions.ts:74`; `CLAUDE.md:71`
- **Claimed:** `schema.ts` is where structured-output schemas are defined/registered. **Actual:** `schema.ts` holds only the CV-analysis schema; there is no registry. Each feature co-locates its own schema file. New sourcing schemas should live in their own `lib/gemini/<feature>.ts`. — `lib/gemini/schema.ts:8-89`; `lib/gemini/job-draft.ts:8-71`; `lib/gemini/interview-questions-types.ts:13-30`
- **Claimed:** token usage is returned/recorded uniformly by the wrappers. **Actual:** only `callGeminiProJson` returns tokens; `callGeminiFlashJson` returns only `{ text, durationMs }`. DB recording (`ai_processing_attempts`) is done by the caller/route, never the wrapper; `calcCost` uses Pro pricing only. — `lib/gemini/call-flash.ts:15-18`; `lib/gemini/call-pro.ts:11-16, 39-48`; `lib/gemini/cost.ts:4-6`
- **Claimed:** `INPUT_USD_PER_MTOK` / `OUTPUT_USD_PER_MTOK` live in `cost.ts`. **Actual:** they are DEFINED in `client.ts:26-27` and only IMPORTED by `cost.ts:1`. Import constants from `lib/gemini/client`, the helper from `lib/gemini/cost`. — `lib/gemini/cost.ts:1` vs `lib/gemini/client.ts:26-27`
- **Claimed:** the cost/token column is `input_tokens`. **Actual:** the column is `prompt_tokens` (paired with `output_tokens`); there is NO `input_tokens` anywhere. Mirror `prompt_tokens`. — `supabase/migrations/20260420000010_ai_attempts.sql:11-12`; `types/supabase.ts:41-42`
- **Claimed:** the cost function takes a usage object. **Actual:** `calcCost` takes two plain numbers; callers must extract `usage.promptTokenCount`/`usage.candidatesTokenCount` themselves. — `lib/gemini/cost.ts:4`; `supabase/functions/process-cv/index.ts:370-372`

### notifications
- **Claimed:** dispatch fans out to Telegram. **Actual:** `dispatch.ts` does NOT import/call `telegram.ts`; the only channels are in-app + email. `telegram.ts` (`sendTelegramMessage`, `notifyContactMessage`) is used ONLY by the public contact form. **Sourcing events will NOT reach Telegram via `dispatchNotification`** — adding a Telegram channel is net-new work, not a config toggle. — `lib/notifications/dispatch.ts:1-8`; `lib/notifications/telegram.ts:11-65`
- **Claimed:** `notification_deliveries` / `notification_delivery_status` / `notification_suppressions` have generated TS types. **Actual:** they are ABSENT from `types/supabase.ts`; `dispatch.ts` compiles only because `createAdminClient()` is untyped (no `<Database>` generic). Types are stale relative to migration 260. — `types/supabase.ts` (no match); `lib/supabase/admin.ts:10-21`
- **Claimed:** the retry pipeline is fully wired. **Actual:** the cron is scheduled but the `dispatch-notification-retries` Edge Function **does not exist on disk** (only `_shared` + `process-cv`); HARDENING_NOTES PR 11 marks it Deferred ("a 404 until deployed"). Queued/failed sourcing notifications will NOT auto-retry yet. — `supabase/functions/`; `HARDENING_NOTES.md:102`

### edge worker
- **Claimed:** verify_jwt setting lives in `config.toml`. **Actual:** there is NO `[functions]`/`[functions.process-cv]` block; JWT is disabled purely via `supabase functions deploy <name> --no-verify-jwt`. `config.toml` has only `[edge_runtime]`. — `supabase/config.toml:367-379`; `README.md:67`; `DEPLOYMENT.md:48`
- **Claimed:** process-cv is the only Edge Function pattern. **Actual:** `dispatch-notification-retries` is referenced by a cron but its code does not exist; process-cv is the only real working template. — `supabase/migrations/20260420000260_notification_deliveries.sql:101-126`; `HARDENING_NOTES.md:102`
- **Claimed:** `_shared` provides a reusable admin client / Gemini caller / logger. **Actual:** `_shared` provides ONLY `cors.ts`. process-cv inlines admin-client, Gemini, and `log()`. — `supabase/functions/_shared/cors.ts:1-5`

### quota / billing
- **Claimed:** `try_consume_cv_quota` returns "success + remaining". **Actual:** it returns ONLY a scalar boolean (no remaining/used/limit). The richer jsonb `{used, limit}` shape exists only in `book_interview_request`. If sourcing must surface used/limit, follow the jsonb pattern, not the boolean one. — `supabase/migrations/20260420000024_p7_quota_atomic.sql:9` vs `20260420000220_interview_quota_atomic.sql:26, 61-68`
- **Claimed:** the interview RPC is named `try_consume_interview_quota`. **Actual:** no such function; the interview function is `book_interview_request` (returns jsonb) and does quota-check AND insert in one call. Trial cap `3` is hardcoded as `v_limit int := 3`, not a column. — `supabase/migrations/20260420000220_interview_quota_atomic.sql:16, 35`
- **Claimed:** interview/CV quota is always a consumed-count column like `cv_quota_used`. **Actual:** true for CV (`cv_quota_used`/`cv_quota_limit`), but interview bookings are counted by rolling 30-day `count(*)` over `interview_requests`. Where consumed counts live depends on quota type. — `supabase/migrations/20260420000220_interview_quota_atomic.sql:55-59`; `lib/companies/quota.ts:255-264`

### cron / i18n / RLS
- **Claimed:** a single operator-claim form to copy. **Actual:** two coexist — `job_postings` uses the TOP-LEVEL `(auth.jwt() ->> 'is_operator')::boolean = true` (the one to copy for verbatim parity), while the newer `notification_suppressions` uses the NESTED `coalesce((auth.jwt() -> 'app_metadata' ->> 'is_operator')::boolean, false) = true` (more defensive). — `supabase/migrations/20260420000020_rls_policies.sql:149` vs `20260420000260_notification_deliveries.sql:95`
- **Claimed:** the RLS helper may be `is_company_member()` / `current_company_id()`. **Actual:** no such helper; the membership helper is `user_companies()` used as `company_id in (select user_companies())`, and the operator override is an inline JWT expression. — `supabase/migrations/20260420000018_functions.sql:50-58`; `20260420000020_rls_policies.sql:142, 149`
- **Claimed:** i18n keys are free-form (no enum/registry to touch). **Actual:** the `TranslationKey` string-literal union + `Translations = Record<TranslationKey, string>` is a hard TypeScript registry — omitting a key in any of ru/uz/en is a compile error. Not a DB enum, but a hard registry. — `lib/i18n/types.ts:3-9, 2020`; `lib/i18n/ru.ts:1-3`

---

## New constraints discovered (highest-value — the builder MUST respect these)

### job_postings write path
- `jobPostingSchema` requires `id` (string min 1) and `order` (non-negative int) on EVERY hard_requirement, and `min_value` must be present as number-or-null (nullable, not optional). A payload missing `id`/`order` or omitting `min_value` fails with 400. Generate a stable id (`crypto.randomUUID()`) + 0-based `order` index; force `min_value:null` for boolean gates. — `lib/validations/job.ts:3-11`; `components/hr/hard-requirements-editor.tsx:239-247`
- `order` is a contiguous 0-based index re-derived on reorder/remove (`arrayMove(...).map((r,i)=>({...r, order:i}))`); boolean type forces `min_value=null`. — `components/hr/hard-requirements-editor.tsx:231, 259-261, 268`
- `fillMissingLocales(input: PostingFields)` does NOT include `id`/`order` in `PostingFields`; it returns only `label_{ru,uz,en}/type/min_value`. If called server-side you MUST re-attach `id`+`order` after, or downstream `requirements_snapshot`/`evaluateRequirements` (which key on `req.id`) break. Throws `no_source_locale` if no locale has BOTH title and description. — `lib/gemini/translate-posting.ts:18-25, 55-63, 132-152`; `lib/validations/requirements.ts:29-37`

### candidates / tenancy
- **Enum-add guard:** `ALTER TYPE ... ADD VALUE` cannot run in the same transaction it is used in (Supabase wraps each migration in a txn). If sourcing needs a new `candidate_status` (e.g. `sourced`), add the value in its OWN migration and do NOT INSERT/UPDATE rows with it in the same file. — `supabase/migrations/20260420000300_candidate_requirements_evaluation.sql:6-11`
- `candidates` has NO `company_id`/tenant column; tenancy is derived by joining `job_posting_id → job_postings.company_id`. Any promote-to-candidate flow MUST attach a valid `job_posting_id` (NOT NULL FK, ON DELETE CASCADE). — `supabase/migrations/20260420000009_candidates.sql:7`
- `phone_number` is NOT NULL + CHECK `^\+998\d{9}$`. **A promoted sourced candidate must have a phone in this exact Uzbek format or the insert fails** — many external sources won't supply this; promote-to-candidate needs a phone-collection / placeholder strategy. — `supabase/migrations/20260420000009_candidates.sql:9`; `app/api/apply/route.ts:78-80`
- Candidate inserts use the service-role admin client (bypasses RLS) and set `requirements_snapshot` = raw `HardRequirement[]` and `requirements_responses` = `Record<string,string>` (or null). Mirror this to keep HR red-flag/requirements-gap UI working. — `app/api/apply/route.ts:101, 168-177`

### gemini / cost / telemetry
- `ai_processing_attempts.candidate_id` is NOT NULL (FK to candidates). **A sourcing feature producing AI usage BEFORE a candidate exists cannot log here as-is** — the sourcing tables must own their own token/cost columns (`input_tokens`/`output_tokens`/`cost_usd`) on `sourcing_searches`. `company_id` IS nullable on attempts. — `supabase/migrations/20260420000010_ai_attempts.sql:7-8`; `types/supabase.ts:45-57`
- `ai_attempt_status` enum is exactly `{success, failed, timeout, rate_limited}`. Operator metrics count failures as `status <> 'success'`. — `types/supabase.ts:1138, 1299`; `supabase/migrations/20260420000100_operator_daily_metrics.sql:39`
- To distinguish a new AI workload, mint a model TAG of form `${MODEL}/<feature>` written to the `model` free-text column, kept in a `-types` file out of client bundles (e.g. `INTERVIEW_QUESTIONS_MODEL_TAG`). — `lib/gemini/interview-questions-types.ts:53-59`
- Zod must be imported from `"zod/v4"` in all `lib/gemini` / `lib/validations` files. — `lib/gemini/schema.ts:1`; `lib/gemini/job-draft.ts:1`
- The Gemini client is server-only (`process.env.GOOGLE_GEMINI_API_KEY`, `@google/genai ^1.50.1`). Never import `call-flash`/`call-pro`/`client` from a client component. — `lib/gemini/client.ts:1-12`
- Wrappers return RAW JSON string and do NOT parse/validate. Every caller must `JSON.parse` in try/catch then run mirrored Zod `safeParse`, surfacing distinct codes (`invalid_json` vs `schema_mismatch`); no auto-retry. — `lib/gemini/interview-questions.ts:181-191`; `app/api/hr/jobs/ai-draft/route.ts:51-66`
- Prompt builders thread per-company tone via `toneInstruction(tone)` from `getAiSettings(companyId)` (`AiTone='direct'|'neutral'|'generous'`, default `neutral`). — `lib/gemini/prompts.ts:1, 57`; `lib/ai-settings.ts:8, 40`
- **`calcCost` HARDCODES Pro pricing and takes no model arg; if sourcing uses `MODEL_FLASH` it will OVER-price ~13×.** Add a model-aware cost helper (the funnel is Flash-heavy). Flash constants exist but are wired into no helper. — `lib/gemini/cost.ts:4-6`; `lib/gemini/client.ts:23, 30-31`
- The Edge Function maintains a DUPLICATE local `calcCost` (Deno cannot import Next.js lib). The sourcing Edge worker must replicate the cost helper; pricing changes require updating BOTH places. — `supabase/functions/process-cv/index.ts:104-106` vs `lib/gemini/cost.ts:4-6`
- `cost_usd` is `numeric(10,6)` per row; operator rollups cast aggregates to `numeric(12,6)`. Mirror these precisions for any new sourcing cost column/rollup, and carry a denormalized `company_id` for per-company rollups. — `supabase/migrations/20260420000010_ai_attempts.sql:14`; `supabase/migrations/20260420000100_operator_daily_metrics.sql:37, 70-72`

### notifications — registering `sourcing_complete` / `sourcing_failed`
Adding an event requires editing AT LEAST 7 coordinated locations, several of which `dispatch.ts` will not compile without:
1. `ALTER TYPE notification_event_kind ADD VALUE IF NOT EXISTS '<event>'` in a NEW migration (own migration; cannot add+use in same txn). — `20260420000090_notification_preferences.sql:49-56`
2. Add matching `email_*`/`inapp_*` boolean columns to `notification_preferences` for any toggleable pref (else dispatch defaults ON). — `20260420000090_notification_preferences.sql:11-40`
3. Add an entry to `emailColumn` (`Record<Event, keyof PrefsRow>` — exhaustive; missing key = TS error). — `lib/notifications/dispatch.ts:24-40`
4. Add an entry to `inappColumn` (same exhaustiveness). — `lib/notifications/dispatch.ts:24-40`
5. Add the event to the `NotificationEvent` union AND `SUBJECT_KEYS` (exhaustive Record) in the email template. — `lib/email/templates/notification.ts:7-30`
6. Add `notifications.email.subject_<event>` to the `TranslationKey` union AND all three locale files. — `lib/i18n/types.ts:381-386`
7. Regenerate `types/supabase.ts` so the Enums + Constants arrays include the new value.

Additional notification constraints:
- `emailColumn`/`inappColumn` keys must be REAL `notification_preferences` columns (`keyof PrefsRow`); add new `email_sourcing_*`/`inapp_sourcing_*` columns or deliberately alias. — `lib/notifications/dispatch.ts:24-42`
- All `notification_deliveries`/`notification_suppressions` writes go through `createAdminClient()` (RLS: insert/update only to `service_role`). — `20260420000260_notification_deliveries.sql:60-99`; `lib/supabase/admin.ts:3-8`
- `dispatchNotification` resolves recipients from `company_members`; omit `userIds` → fans out to ALL company members. Prefs rows auto-created by trigger default every channel ON. — `lib/notifications/dispatch.ts:64-78, 114-123`
- **`actionUrl` is hardcoded to `${env.APP_URL}/hr/dashboard` for every email; `DispatchInput` has no url field.** A sourcing-results deep link requires modifying the `renderNotificationEmail` caller in `dispatch.ts`. — `lib/notifications/dispatch.ts:155-162`
- Retries are NOT self-healing today (the retries Edge Function is unimplemented). A sourcing notification landing in `queued` (quiet hours) or `failed` stays stuck until that function ships. Do not rely on auto-retry. — `HARDENING_NOTES.md:102`

### edge worker invocation reality
- pg_cron HTTP invocation depends on two Postgres GUCs NOT set by any migration: `app.settings.supabase_url` and `app.settings.service_role_key` (provisioned out-of-band via `ALTER DATABASE ... SET ...`). A sourcing cron silently fails if these are unset — document in DEPLOYMENT.md. — `20260420000021_cron.sql:13-16`; `20260420000260_notification_deliveries.sql:118-121`
- Edge env/secrets are Supabase secrets, NOT `.env`: `GOOGLE_GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (`SUPABASE_URL` auto-injected). Set via `supabase secrets set ...`; Deno reads `Deno.env.get(...)`. — `supabase/functions/process-cv/index.ts:1-3, 240-242`
- Next.js → Edge invocation must use the admin (service-role) client wrapped in `after(...)` (fire-and-forget), with `export const runtime = 'nodejs'` (apply route also sets `export const maxDuration = 30`); `functions.invoke` errors are swallowed and logged, never surfaced. — `app/api/apply/route.ts:1-13, 256-278`
- The worker must own its idempotent atomic claim (conditional UPDATE flipping status only from allowed prior states, bail with 200 skipped if no row claimed) to prevent duplicate Gemini spend when both an API route and a cron hit the same id. — `supabase/functions/process-cv/index.ts:250-263`
- A new sourcing function needs its own `supabase functions deploy <name> --no-verify-jwt` and will not appear in `config.toml`. The Deno worker cannot import `lib/...`; it must inline (copy) any needed helpers/schemas. Error strings are truncated to 500 chars before persistence. — `supabase/config.toml`; `supabase/functions/process-cv/index.ts:13-19, 461-501`

### quota / billing migration & RPC conventions
- **`types/supabase.ts` is STALE relative to the latest migrations** (`subscriptions` lacks `plan_id`/`current_period_end`/`grace_period_ends_at`; `subscription_plans`/`subscription_invoices`/`book_interview_request` absent). A new `try_consume_sourcing_quota` RPC + new columns won't typecheck until you regenerate types (`supabase gen types typescript --local > types/supabase.ts`). Coding rule #1 forbids `any`/`@ts-ignore`; CI runs typecheck. — `types/supabase.ts:814-864, 1122-1135`
- Every quota RPC must be `security definer` + `set search_path = public` and take the company id as first arg named `p_company_id uuid` (PostgREST matches arg names; TS passes `{ p_company_id }`). — `20260420000024_p7_quota_atomic.sql:8-12`; `lib/companies/quota.ts:134-136`
- GRANT divergence: CV quota functions have NO explicit grant (rely on default PUBLIC); `book_interview_request` ends with explicit `grant execute ... to authenticated, service_role`. With migration 280 tightening grants, the sourcing RPC SHOULD include an explicit `grant execute ... to service_role` (and `authenticated` only if called from a non-admin client). — `20260420000220_interview_quota_atomic.sql:117-119`; `20260420000280_security_advisor_fixes.sql`
- Quota invariant to replicate: `active` → allow & NO bump; `trialing` in-window & under-limit → bump; else → deny; refunds clamp at 0 (`greatest(...-1,0)`) and only touch `trialing` rows. — `20260420000024_p7_quota_atomic.sql:30-44`; `20260420000031_refund_cv_quota.sql:16-22`
- Pair each atomic RPC with a non-atomic read-only predicate in `lib/companies/quota.ts` and add the new reason to the `QuotaReason` union. Add `canSource()` + `incrementSourcingQuota()`, mirroring `canProcessCv` + `incrementCvQuota`. — `lib/companies/quota.ts:5-11, 104-139, 277-281`
- Sourcing trial quota columns (`sourcing_quota_used`/`sourcing_quota_limit`) belong on `subscriptions` alongside `cv_quota_*`; a per-plan `sourcing_quota_monthly` belongs on `subscription_plans` (seed it on `pro_monthly_flat`). — `20260420000006_subscriptions.sql:4-14`; `20260420000270_billing.sql:25-65`

### cron / i18n / RLS conventions
- Every new i18n key must be added in FOUR places: the `TranslationKey` union in `types.ts` PLUS all three catalogs (ru/uz/en). Missing one fails `tsc`. — `lib/i18n/types.ts:2020`; `lib/i18n/index.ts:8-12`
- Server components use `getT()` (`lib/i18n/server.ts`, returns 2-arg `t(key, vars?)` with locale bound); client components use `useTranslation()` (`lib/i18n/provider.tsx`, 2-arg). The server core `t` is 3-arg (`key, locale, vars?`). — `lib/i18n/server.ts:11-17`; `lib/i18n/provider.tsx:28-39`
- New cron jobs must wrap `perform cron.unschedule('<name>')` in a `do $$ ... exception when others then null; end $$;` block BEFORE `cron.schedule(...)` for idempotency. — `20260420000260_notification_deliveries.sql:106-126`
- New tenant-scoped sourcing tables need: `enable row level security`; a `<table>_member_all` policy using `company_id in (select user_companies())`; a `<table>_operator_read` (or `_all`) policy using the JWT `is_operator` claim. The worker uses the service-role admin client (bypasses RLS). — `20260420000020_rls_policies.sql:8-25, 141-149`
- Enum creation must use the idempotent guard `do $$ begin if not exists (select 1 from pg_type where typname='...') then create type ... end if; end $$;`. — `20260420000260_notification_deliveries.sql:9-21`

---

## Key signatures to call into

```ts
// lib/gemini/call-flash.ts — Flash; NO token usage returned
interface FlashCallOpts {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: object;        // plain JSON Schema, NOT Zod
  temperature?: number;          // default 0.3
  maxOutputTokens?: number;      // default 4096
}
export async function callGeminiFlashJson(opts: FlashCallOpts): Promise<{ text: string; durationMs: number }>;
```

```ts
// lib/gemini/call-pro.ts — Pro; returns token counts
interface ProCallOpts { systemInstruction: string; userPrompt: string; responseSchema: object; temperature?: number; maxOutputTokens?: number }
export interface ProCallResult { text: string; durationMs: number; promptTokens: number | null; outputTokens: number | null }
export async function callGeminiProJson(opts: ProCallOpts): Promise<ProCallResult>;
```

```ts
// lib/gemini/client.ts
export function getGeminiClient(): GoogleGenAI;   // reads process.env.GOOGLE_GEMINI_API_KEY (server-only)
export const MODEL = "gemini-3.1-pro-preview";
export const MODEL_FLASH = "gemini-3-flash-preview";
export const INPUT_USD_PER_MTOK = 2.0;            // Pro
export const OUTPUT_USD_PER_MTOK = 12.0;          // Pro
export const INPUT_USD_PER_MTOK_FLASH = 0.15;     // telemetry only, not enforced
export const OUTPUT_USD_PER_MTOK_FLASH = 0.6;
```

```ts
// lib/gemini/cost.ts — takes raw token COUNTS; Pro pricing hardcoded (see new-constraints re: Flash mispricing)
export function calcCost(promptTokens: number, outputTokens: number): number;
```

```ts
// lib/notifications/dispatch.ts — event fan-out (in-app + email only; NO telegram)
type Event = Database["public"]["Enums"]["notification_event_kind"];
interface DispatchInput { companyId: string; event: Event; title: string; body?: string; entityType?: string; entityId?: string | null; metadata?: Record<string, unknown>; userIds?: string[] }
export async function dispatchNotification(input: DispatchInput): Promise<void>;
export function computeNextRetryAt(attempt: number, base?: Date): Date;   // 1m / 5m / 30m
```

```ts
// lib/companies/quota.ts — boolean RPC wrapper (mirror for incrementSourcingQuota)
export async function incrementCvQuota(companyId: string): Promise<boolean>;
// internally: admin.rpc("try_consume_cv_quota", { p_company_id: companyId }); return data === true;
export type QuotaReason = "no_subscription" | "subscription_inactive" | "job_quota_exceeded" | "cv_quota_exceeded" | "interview_quota_exceeded" | "scheduling_quota_exceeded";
```

```sql
-- supabase/migrations/20260420000024_p7_quota_atomic.sql — atomic FOR UPDATE, boolean return
create or replace function try_consume_cv_quota(p_company_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
-- select ... from subscriptions where company_id = p_company_id for update;
-- active => true (no bump); trialing & in-window & under-limit => bump + true; else false
$$;
```

```sql
-- supabase/migrations/20260420000018_functions.sql — RLS membership helper
create or replace function user_companies() returns setof uuid
language sql security definer stable set search_path = public as $$
  select company_id from company_members where user_id = auth.uid()
$$;

-- policies to copy verbatim onto every sourcing table (20260420000020_rls_policies.sql:141-149)
-- create policy <t>_member_all    on <t> for all    using (company_id in (select user_companies()));
-- create policy <t>_operator_read on <t> for select using ((auth.jwt() ->> 'is_operator')::boolean = true);
```

```sql
-- worker-pickup cron (mirror from 20260420000260_notification_deliveries.sql)
do $$ begin perform cron.unschedule('<job-name>'); exception when others then null; end $$;
select cron.schedule('<job-name>', '* * * * *', $$
  select net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/<fn-name>',
    headers := jsonb_build_object('Content-Type','application/json',
               'Authorization','Bearer ' || current_setting('app.settings.service_role_key')),
    body    := '{}'::jsonb::text
  );
$$);
-- pure-SQL TTL purge form: cron.schedule('<name>','30 * * * *', $$ delete from <t> where <ttl> < now() $$);
```

```ts
// ai_processing_attempts Insert shape — candidate_id + model + status REQUIRED (NOT usable pre-candidate)
// candidate_id: string (NOT NULL); company_id?: string|null; model: string (free-text feature tag);
// status: "success"|"failed"|"timeout"|"rate_limited";
// prompt_tokens?, output_tokens?, duration_ms?, cost_usd?, error? (all nullable)
```

---

## Next free migration slot (Phase 0.3)

The latest applied migration on disk is `20260420000300_candidate_requirements_evaluation.sql`. The next free slot is **`20260420000310`** (then `20260420000320`, `20260420000330`, ...). The auto-memory note referencing `20260420000150`/`20260420000210` is **outdated** relative to the committed migrations; new sourcing migrations MUST use a timestamp strictly greater than `20260420000300` so they apply last.

---

## Phase-1 implications (deferred items called out by the spec)

- **External connectors require human-provided inputs** (hh.uz API creds, Telegram bot token + channel allow-list, sourcing economics/metering). Per the spec, Phase 1 ships **only** the `internal_pool` connector against the `SourceConnector` interface and stops before any external connector. No stubbed external keys / canned responses.
- **Telegram delivery for sourcing notifications** is net-new (dispatch.ts has no Telegram channel today). In-app + email land in Phase 1; Telegram fan-out for `sourcing_complete`/`sourcing_failed` is deferred/optional unless we extend `dispatch.ts`.
- **Notification deep-link** needs a `dispatch.ts` change (hardcoded `/hr/dashboard` actionUrl) — tracked for Phase 1.6.
- **Promote-to-candidate** must solve the `+998…` phone NOT-NULL CHECK for sourced profiles that lack a UZ phone.
- **Sourcing economics** (per-search vs per-candidate vs per-Pro-call metering, per-plan quota) is a required human input before finalizing the quota table/RPC units in Phase 1.1.
