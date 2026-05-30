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

### B3. Set the three database GUCs (enables the cron backstop)

Run once on the **production** database (`alter database` persists them):

```sql
alter database postgres set app.settings.supabase_url     = 'https://<project-ref>.supabase.co';
alter database postgres set app.settings.service_role_key = '<service_role_key>';
alter database postgres set app.settings.app_url          = 'https://<your-app-host>';
select pg_reload_conf();
```

- These let the `source-candidates-pickup` cron re-invoke the worker route for
  crash-recovery and as a backstop for the immediate kick.
- **If `app_url` is unset:** searches still run (the immediate in-process kick
  fires); only crash-recovery/backstop is disabled. So sourcing is _usable_
  without the GUCs, but set them for production resilience.

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

### C2. Telegram + LinkedIn — still need credentials

Scaffolded behind the same `SourceConnector` interface, not yet built (we don't
stub external APIs):

| Phase | Source | What to provide | Reality |
| --- | --- | --- | --- |
| 3 | **Telegram** | Bot token + an allow-list of channels/groups | A bot reads only channels it's added to — this is *monitoring chosen CV channels*, not global search. |
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
