# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth: signup → verify → login >> user can sign up, verify email, and sign in
- Location: tests\e2e\auth.spec.ts:27:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://127.0.0.1:3000/#access_token=eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiI2MjNmZTNlYy02ZTQ4LTQ4MDAtYTcxYy05YmJkYWIxZjExZTUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2NDQyMzc4LCJpYXQiOjE3NzY0Mzg3NzgsImVtYWlsIjoiZTJlLTE3NzY0Mzg3NzcwNThAdGVzdC5ocmF0cy5sb2NhbCIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7ImlzX29wZXJhdG9yIjpmYWxzZSwicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6ImUyZS0xNzc2NDM4Nzc3MDU4QHRlc3QuaHJhdHMubG9jYWwiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiRTJFIFRlc3QgVXNlciIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNjIzZmUzZWMtNmU0OC00ODAwLWE3MWMtOWJiZGFiMWYxMWU1In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzc2NDM4Nzc4fV0sInNlc3Npb25faWQiOiI0M2JkZGNhMi05YjZlLTQ3MTctOGQ3MC0yMWFiMDgzZGMwNGMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.Y-9RHdqmfVUtBdOaTnAIC4rfDwvvgN3k9yokwz46mMmYceRHsKQ_170p28WpnRNTSP3203N1XZUF7JNhIxh-6Q&expires_at=1776442378&expires_in=3600&refresh_token=exbnh5gfashe&sb=&token_type=bearer&type=magiclink"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "ATS" [level=1] [ref=e3]
    - paragraph [ref=e4]: Applicant Tracking System
    - generic [ref=e5]:
      - link "HR Portal" [ref=e6] [cursor=pointer]:
        - /url: /hr/dashboard
      - link "Operator" [ref=e7] [cursor=pointer]:
        - /url: /operator
  - alert [ref=e8]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { createClient } from "@supabase/supabase-js";
  3  | 
  4  | /**
  5  |  * Email signup → verify → login happy path.
  6  |  *
  7  |  * Local Supabase auto-confirms emails, so after signup the user lands on
  8  |  * /onboarding (not /auth/verify). We adapt the test accordingly:
  9  |  *   - In local dev: signup → auto-confirm → redirect to /onboarding
  10 |  *   - In prod/CI with real email: signup → /auth/verify → manual confirmation
  11 |  *
  12 |  * We still test the full login flow by generating a confirmation link via
  13 |  * the admin API and exercising the /auth/callback route.
  14 |  *
  15 |  * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env
  16 |  * (local supabase: `supabase start` sets these).
  17 |  */
  18 | 
  19 | const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  20 | const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  21 | 
  22 | const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);
  23 | 
  24 | test.describe("Auth: signup → verify → login", () => {
  25 |   test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  26 | 
  27 |   test("user can sign up, verify email, and sign in", async ({ page }) => {
  28 |     const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
  29 |       auth: { autoRefreshToken: false, persistSession: false },
  30 |     });
  31 | 
  32 |     const email = `e2e-${Date.now()}@test.hrats.local`;
  33 |     const password = "TestPassword123!";
  34 |     const fullName = "E2E Test User";
  35 | 
  36 |     // ── 1. Sign up ────────────────────────────────────────────────────
  37 |     await page.goto("/auth/signup");
  38 |     await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible({
  39 |       timeout: 10000,
  40 |     });
  41 |     await page.getByLabel("Full name").fill(fullName);
  42 |     await page.getByLabel("Email").fill(email);
  43 |     await page.getByLabel("Password").fill(password);
  44 |     await page.getByRole("button", { name: /create account/i }).click();
  45 | 
  46 |     // Local Supabase auto-confirms, so user may land on /auth/verify OR /onboarding
  47 |     await page.waitForURL(/\/(auth\/verify|onboarding)/, { timeout: 15000 });
  48 | 
  49 |     // On local Supabase with auto-confirm, the /auth/verify page may
  50 |     // immediately redirect to /onboarding once the session cookie is set,
  51 |     // so we don't assert on the verify-page copy here — the post-callback
  52 |     // landing at step 3 is what actually proves verification worked.
  53 | 
  54 |     // ── 2. "Receive" a magic-link email → get the link via admin API.
  55 |     // Local Supabase auto-confirms, so the user is already registered by
  56 |     // this point. Use `magiclink` (not `signup`) to generate a valid login
  57 |     // URL for the existing confirmed user.
  58 |     const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  59 |       type: "magiclink",
  60 |       email,
  61 |       options: { redirectTo: "http://localhost:3000/auth/callback?next=/onboarding" },
  62 |     });
  63 |     expect(linkError, "generateLink should succeed").toBeNull();
  64 |     const actionLink = linkData?.properties?.action_link;
  65 |     expect(actionLink, "action_link should be present").toBeTruthy();
  66 | 
  67 |     // ── 3. Visit verification link → lands on /onboarding or /hr/dashboard
  68 |     await page.goto(actionLink!);
> 69 |     await page.waitForURL(/\/(onboarding|hr\/dashboard)/, { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  70 | 
  71 |     // Sign out via the logout API route so we can test login next.
  72 |     await page.request.post("/api/auth/logout").catch(() => undefined);
  73 |     await page.context().clearCookies();
  74 | 
  75 |     // ── 4. Log in with the verified credentials ───────────────────────
  76 |     await page.goto("/auth/login");
  77 |     await page.getByLabel("Email").fill(email);
  78 |     await page.getByLabel("Password").fill(password);
  79 |     await page.getByRole("button", { name: /sign in/i }).click();
  80 |     await page.waitForURL(/\/(hr\/dashboard|onboarding)/, { timeout: 15000 });
  81 | 
  82 |     // ── Cleanup ───────────────────────────────────────────────────────
  83 |     const { data: userList } = await admin.auth.admin.listUsers();
  84 |     const created = userList?.users.find((u) => u.email === email);
  85 |     if (created) {
  86 |       await admin.auth.admin.deleteUser(created.id);
  87 |     }
  88 |   });
  89 | });
  90 | 
```