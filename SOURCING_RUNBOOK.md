# Active Sourcing — How to run it

A plain, do-this-in-order guide to make the outbound candidate-sourcing feature
fully workable. Three tracks:

- **A. Run it locally, end-to-end, today** — no external credentials needed.
- **B. Ship it to production** — Railway + Supabase.
- **C. Turn on external sources later** — hh.uz / Telegram / LinkedIn (Phases 2–4).

> What this feature does: from a job posting, HR clicks **Find candidates** → a
> background search pulls candidates from your **own past applicants**, an AI
> judges each against the job's _hard requirements_, and you get a ranked top-20
> where **every candidate provably meets every hard requirement** (with cited
> evidence). Phase 1 searches your internal pool only.

---

## A. Run it locally, end-to-end (no external creds)

Everything here works on your machine right now. The worker runs **in-process**
(the "Find candidates" button calls the funnel directly via `after()`), so you
do **not** need the production GUCs, the cron, or `app_url` for local testing.

### A1. Prerequisites

1. **Docker Desktop running** (Supabase local stack needs it).
2. **A Google Gemini API key** — the only external dependency. Get one free at
   <https://aistudio.google.com/app/apikey>. This is the one thing the feature
   cannot run without: the funnel makes real Gemini calls to judge candidates.

### A2. Configure the key

In `.env.local` (copy `.env.local.example` if you don't have one yet):

```bash
GOOGLE_GEMINI_API_KEY=your-key-here
```

The other local Supabase values are already wired by `supabase start`. You do
**not** need to set any `app.settings.*` for local use.

### A3. Start everything

```bash
supabase start          # boots Postgres + applies all migrations
supabase status         # sanity-check: should list API + DB URLs
pnpm dev                # Next.js dev server on http://localhost:3000
```

### A4. Make sure there's something to find

The internal-pool connector searches **your company's past candidates from
_other_ job postings**. So a brand-new database finds nothing. You need:

- **One job posting with hard requirements** — the job you'll source _for_.
  Create it in the UI: `/hr/jobs` → New job → add at least one **hard
  requirement** (e.g. "Driver's licence", "3 years experience"). The hard
  requirements are the gate; with none, every candidate vacuously passes.
- **At least one _other_ job with a few candidates** — the pool to search.
  Easiest: create a second job, open its public apply link
  (`/apply/<token>`), and submit 3–5 test applicants. Once they're screened
  they live in `candidates` and become sourceable.

> Quick alternative for a smoke test: insert a few `candidates` rows under a
> second job via SQL. They need `full_name`, a `+998` `phone_number`, and ideally
> `requirements_snapshot` / `requirements_responses` so the AI has something to
> judge.

### A5. Run a search and watch it

1. Open the job you want to source for → click **Find candidates** (or the
   **Sourcing** button → **New search**).
2. You land on the results page; it **auto-refreshes** while the run is in
   flight (`queued` → `running` → `completed` / `partial`).
3. When it finishes you'll see:
   - the ranked **top-20** (highest → lowest fit), each with a ✓/✗ **hard
     requirement checklist** and quotable evidence (open the evidence drawer);
   - a **funnel breakdown** — "how we reached this shortlist": how many were
     fetched, deduped, passed the gate, scored, verified, shortlisted, and
     _why_ candidates dropped at each stage;
   - the **AI cost** for the run (tokens + USD).
4. **Promote** a candidate to turn them into a real applicant on this job.

### A6. Reading the result honestly

- **Empty shortlist is a valid, correct outcome.** It means nobody in your pool
  provably meets _every_ hard requirement. The gate is **fail-closed**: missing,
  ambiguous, or low-confidence evidence counts as _not met_. The funnel
  breakdown shows exactly where everyone dropped.
- **`partial` status** means a source errored and was skipped (you'll see a
  "some sources didn't respond" note). With internal-pool only, this is rare.

### A7. If something looks wrong

| Symptom | Cause / fix |
| --- | --- |
| Search stuck in `queued` | The dev server restarted before the in-process kick ran. In dev there's no cron backstop — just click **Find candidates** again, or restart `pnpm dev` and re-run. |
| Search ends `failed` | Check the dev server console for `[sourcing]` logs. Most common: missing/invalid `GOOGLE_GEMINI_API_KEY`. The quota unit is auto-refunded on failure. |
| Shortlist always empty | Either the pool is empty (no candidates in _other_ jobs) or nobody meets the hard requirements. Open the funnel breakdown to see which is true. |
| "Already searching" (409) | A run for this job is already queued/running (one in-flight search per posting by design). Wait for it to finish. |
| Quota exceeded (402) | Trial companies get 2 runs. Raise it: `update subscriptions set sourcing_quota_limit = 10 where company_id = '<id>';` |

---

## B. Ship it to production

The full reference is **`DEPLOYMENT.md` §15**. The minimum to make sourcing work
in prod:

### B1. Apply migrations

```bash
supabase db push        # applies …000310 (engine) + …000320 (notifications)
```

### B2. Set environment variables (Railway → each service → Variables)

The feature itself only adds a hard dependency on **`GOOGLE_GEMINI_API_KEY`**.
You'll already have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `APP_URL` from the base deploy.

### B3. Store the three secrets in Vault (enables the cron backstop)

The cron jobs read the project URL, service-role key, and app host from
**Supabase Vault** (migration `…000330` points them there). On hosted Supabase
you **cannot** use `alter database ... set app.settings.*` — the `postgres` role
isn't a superuser, so it fails with `42501: permission denied to set parameter`.
Vault works because `postgres` (which pg_cron runs as) can read it.

Run once on the **production** database, **after** `supabase db push`:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'supabase_url');
select vault.create_secret('<service_role_key>',                'service_role_key');
select vault.create_secret('https://<your-app-host>',           'app_url');
```

- These let the `source-candidates-pickup` cron re-invoke the worker route for
  crash-recovery and as a backstop for the immediate kick.
- **If they're unset:** searches still run (the immediate in-process kick
  fires); only crash-recovery/backstop is disabled, and the cron logs a loud
  `app_cron_secret: Vault secret "…" is not set` each run. So sourcing is
  _usable_ without them, but set them for production resilience.
- To rotate later: `select vault.update_secret((select id from vault.secrets
  where name = 'service_role_key'), '<new>');`

### B4. Verify the cron jobs exist

```sql
select jobname, schedule from cron.job
 where jobname in ('source-candidates-pickup', 'purge-expired-sourcing');
```

Expect `*/2 * * * *` (pickup) and `45 3 * * *` (nightly TTL purge).

### B5. (Optional) Tune quotas

```sql
update subscriptions       set sourcing_quota_limit  = 2  where company_id = '<id>';   -- trial cap
update subscription_plans  set sourcing_quota_monthly = 50 where code = 'pro_monthly_flat';
```

### B6. Confirm it's healthy

- **Operator portal → Sourcing** (`/operator/sourcing`): cross-tenant runs +
  AI spend. If runs appear here with sane token/cost numbers, the pipeline works.
- **A job's Sourcing tab** (`/hr/jobs/<id>/sourcing`): per-job run history.

---

## C. External sources

### C1. hh.uz (HeadHunter) — BUILT. Paste credentials to activate.

The hh.uz connector is implemented and wired into the funnel
(`lib/sourcing/connectors/hh/`). It activates automatically when its credentials
are present — no code change, no redeploy of logic.

**To turn it on:**

1. Register an OAuth app at <https://dev.hh.ru> → copy its **client id** + **client secret**.
2. Add to `.env.local` (local) or your Railway service (prod):
   ```bash
   HH_CLIENT_ID=your-client-id
   HH_CLIENT_SECRET=your-client-secret
   # optional: narrow to a region (find ids via GET https://api.hh.ru/areas)
   HH_AREA_ID=
   ```
3. Restart the app. Now **Find candidates** searches the hh.uz resume database
   **in addition to** your internal pool; the search's `sources` records `hh`,
   and the operator/results funnel shows the hh contribution.

**The one live-only caveat (by design, not a gap):** hh has two access levels.
- **Application token** (just id + secret) — what most apps get out of the box.
- **Employer token** — required if *your* hh account gates the resume database
  behind an authorized employer. If a live search returns `401`/empty from hh,
  that's the signal: complete hh's one-time employer OAuth consent and paste the
  resulting refresh token into **`HH_REFRESH_TOKEN`**. The client then uses it
  (and auto-refreshes) — it takes precedence over id+secret. No other change.

**Honest limitations of hh search results:** hh withholds names and contact
details (phone/email) on *unopened* resumes — opening a resume is a paid action
on hh. So sourced hh candidates show their headline, location, experience, and
skills (enough for the AI to judge against your hard requirements) and a **link
to open the resume on hh**, but typically no phone until you open it there.
Because promotion to a real candidate needs a `+998` phone, you'll usually open
promising hh resumes on hh first. This is hh's policy, not a bug — and we never
fabricate the missing data.

### C2. Telegram — BUILT. Provide a user session + channel allow-list to activate.

The Telegram connector is implemented and wired into the funnel
(`lib/sourcing/connectors/telegram/`). Like hh, it activates automatically when
its credentials are present — no code change.

**Why a user session, not a bot:** there is no global Telegram search; you can
only read channels you have access to. A **bot** sees only messages posted
*after* it joins a channel and exposes almost no history — too weak for sourcing.
So the connector uses an **MTProto user client** (GramJS) that reads full history
of the public job/CV channels your account already follows. Scope is *monitoring
an explicit allow-list*, not scraping Telegram — channels are public boards you
already follow, within Telegram's ToS.

**To turn it on:**

1. Create an app at <https://my.telegram.org> → **API development tools** → copy
   **api_id** (a number) and **api_hash**.
2. Generate a **StringSession** once with a GramJS/Telethon login script (it logs
   in as your account and prints the session string). This is the step that needs
   a real account + the SMS login code — there is no way around it, and we never
   invent a session string.
3. Add to `.env.local` (local) or your Railway service (prod):
   ```bash
   TELEGRAM_API_ID=123456
   TELEGRAM_API_HASH=your-api-hash
   TELEGRAM_SESSION=your-string-session
   # comma-separated allow-list of channels your account is a member of:
   TELEGRAM_CHANNELS=ish_uz,hh_vacancy,tashkent_jobs
   # optional tuning (defaults shown):
   # TELEGRAM_MAX_AGE_DAYS=45
   # TELEGRAM_PER_CHANNEL_LIMIT=200
   ```
4. Restart the app. **Find candidates** now also surfaces candidates actively
   looking in those channels; the search's `sources` records `telegram`.

**What it does (the anti-staleness intelligence):** ignores any post older than
`TELEGRAM_MAX_AGE_DAYS`; collapses reposts (same @handle / phone across channels
and months) to the **latest** message; drops "found a job / vacancy closed /
не актуально" posts; and runs each surviving post through Gemini Flash to keep
**only real candidate CVs** — a recruiter's job offer is classified `vacancy` and
**dropped** (surfacing a vacancy as a candidate is an unacceptable failure we
test against). Every extracted field carries a verbatim quote from the post, and
the @handle/phone is captured so a Telegram candidate is promotable. Recency is a
ranking input — among equally-qualified people, the more recently active sorts
higher. Contacts your company already has (applicants or previously sourced) are
suppressed.

**Two live-only prerequisites (by design, not gaps):** the session string above,
and a working **Gemini key** (classification/extraction runs on Gemini Flash).
The code + 33 unit tests run fully without either; a live run needs both.

### C2b. Telegram BOT intake — BUILT. For channels you OWN, no session needed.

C2 reads PUBLIC channels you don't own (needs the MTProto user session). If
instead each company runs **its own CV-intake channel**, a plain **bot** is
enough — no `my.telegram.org` app, no StringSession. The catch the design works
around: the Bot API has **no get-history method**, so a bot can never re-fetch
past posts; it only receives each `channel_post` as it's posted. So the bot
**persists every post as it arrives** into the `telegram_posts` staging table,
classifies it **once** there (the cost win — search reads are then free of
Gemini), and the funnel reads candidates straight from that table.

**To turn it on:**

1. You already have a bot (`TELEGRAM_BOT_TOKEN`, used for inbox DMs). Reuse it —
   nothing new to create. (Optional: set `TELEGRAM_INTAKE_RETENTION_DAYS=90` to
   change the freshness/retention horizon; default is ~3 months.)
2. Add the **TezHR bot as an administrator** of each company's intake channel
   (Telegram → channel → Administrators → Add). A bot can only read a channel it
   administers — this is the access grant.
3. Register the channel handle so posts are attributed to the right company:
   `POST /api/hr/telegram-channels { "handle": "acme_cv" }` (any HR member with
   write access; a UI surface is the remaining follow-up). A handle is claimed by
   exactly **one** company — the global-unique boundary that stops one tenant
   ingesting another's channel. `GET` lists, `DELETE /…/{id}` removes,
   `PATCH /…/{id} { "active": false }` pauses without losing the claim.
4. The `telegram-bot-ingest` pg_cron job (every 2 min) polls the bot, stores new
   posts, and classifies them. **Find candidates** then surfaces fresh CVs from
   those channels; the search's `sources` records `telegram`.

**Same anti-staleness intelligence as C2**, applied at ingest: too-old / closed
("нашёл работу") / contactless / vacancy posts are dropped (cheaply, before any
AI for the obvious ones), only `candidate_cv` survives, every field carries a
verbatim quote, and the 90-day TTL purge (`purge_stale_telegram_posts`, nightly
03:50) keeps the pool fresh so a search never re-surfaces a stale post.

**PII note:** this stores posts (CVs) of people who haven't applied; the 90-day
purge is the retention control and RLS confines reads to the owning company +
operators. The only live prerequisite is a working **Gemini key** (ingest-time
classification) — no user session.

### C3. LinkedIn — still needs scope confirmation

Scaffolded behind the same `SourceConnector` interface, not yet built (we don't
stub external APIs):

| Phase | Source | What to provide | Reality |
| --- | --- | --- | --- |
| 4 | **LinkedIn (by URL)** | The profile URLs to ingest | No candidate-search API exists; scope is *ingest specific URLs you provide*, not searching LinkedIn. |

---

## D. What's verified vs. what still needs a live run

**Verified (2026-05-30, local Supabase):** migrations apply cleanly + idempotently;
all quota / claim / refund / purge RPCs and the in-flight + identity unique
guards behave correctly (see `SOURCING_NOTES.md`); typecheck + 360 unit tests
green.

**Still needs a real run with a Gemini key (do this in A5 above):** the full
funnel against live Gemini, the completion notification + its deep link, and the
Playwright E2E (`pnpm test:e2e`, needs a prod build + browser).

---

## E. Matching-quality eval (golden set)

`pnpm test` is offline/deterministic, so it cannot measure whether the AI gate /
score / verify stages are actually *correct* — only that the plumbing works. The
golden-set eval fills that gap and is the regression guard to run **before**
changing any sourcing prompt, model tier, or `MIN_REQUIREMENT_CONFIDENCE`.

- Fixtures (hand-labeled CV + job pairs with expected gate/verify/score):
  `tests/fixtures/golden-candidates.json`.
- Runner: `tests/eval/golden.eval.test.ts` drives the real funnel stages
  (`createGeminiFunnelMethods` → `evaluateGate` / `evaluateVerification` /
  `computeDeepScore`) and asserts via the pure `compareFixture` (`lib/sourcing/eval.ts`).

Run it (needs a real key — it never stubs the model; self-skips without one):

```bash
GOOGLE_GEMINI_API_KEY=... pnpm eval
```

It is intentionally **excluded from CI** (`vitest.eval.config.ts`, not the
default `tests/unit/**` include). Add a fixture whenever a real run surfaces a
mis-rank, so the case is caught next time. Keep expectations robust (clear-cut
pass/fail; generous `score_gte` margins) since model output is not bit-stable.
