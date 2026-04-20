# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cross-tenant-isolation.spec.ts >> Cross-tenant isolation >> candidate inserted into company B does NOT appear in company A's applicants view
- Location: tests\e2e\cross-tenant-isolation.spec.ts:202:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('A Secret Job 1776438768844-f5ew3')
Expected: visible
Error: strict mode violation: getByText('A Secret Job 1776438768844-f5ew3') resolved to 2 elements:
    1) <h1 class="text-on-surface text-[28px] font-medium">A Secret Job 1776438768844-f5ew3</h1> aka getByRole('heading', { name: 'A Secret Job 1776438768844-' })
    2) <h1 class="text-on-surface text-[28px] font-medium">A Secret Job 1776438768844-f5ew3</h1> aka getByText('A Secret Job 1776438768844-').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('A Secret Job 1776438768844-f5ew3')

```

# Test source

```ts
  112 | test.describe("Cross-tenant isolation", () => {
  113 |   test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  114 | 
  115 |   let admin: SupabaseClient;
  116 |   let tenantA: Seed;
  117 |   let tenantB: Seed;
  118 | 
  119 |   test.beforeAll(async () => {
  120 |     admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
  121 |       auth: { autoRefreshToken: false, persistSession: false },
  122 |     });
  123 |     tenantA = await seedTenant(admin, "a");
  124 |     tenantB = await seedTenant(admin, "b");
  125 |   });
  126 | 
  127 |   test.afterAll(async () => {
  128 |     if (tenantA) await tearDown(admin, tenantA);
  129 |     if (tenantB) await tearDown(admin, tenantB);
  130 |   });
  131 | 
  132 |   test("each owner sees only their own company in /hr/jobs", async ({ browser }) => {
  133 |     const ctxA = await browser.newContext();
  134 |     const ctxB = await browser.newContext();
  135 | 
  136 |     try {
  137 |       const pageA = await signInAs(ctxA, tenantA.email, tenantA.password);
  138 |       const pageB = await signInAs(ctxB, tenantB.email, tenantB.password);
  139 | 
  140 |       await pageA.goto("/hr/jobs");
  141 |       await expect(pageA.getByText(tenantA.jobTitle)).toBeVisible({ timeout: 15000 });
  142 |       await expect(pageA.getByText(tenantB.jobTitle)).toHaveCount(0);
  143 | 
  144 |       await pageB.goto("/hr/jobs");
  145 |       await expect(pageB.getByText(tenantB.jobTitle)).toBeVisible({ timeout: 15000 });
  146 |       await expect(pageB.getByText(tenantA.jobTitle)).toHaveCount(0);
  147 |     } finally {
  148 |       await ctxA.close();
  149 |       await ctxB.close();
  150 |     }
  151 |   });
  152 | 
  153 |   test("direct API calls cannot reach another company's resources", async ({ browser }) => {
  154 |     const ctxA = await browser.newContext();
  155 |     try {
  156 |       await signInAs(ctxA, tenantA.email, tenantA.password);
  157 | 
  158 |       // A tries to read B's job detail via the HR link API → not 200
  159 |       const linkRes = await ctxA.request.get(`/api/hr/jobs/${tenantB.jobId}/link`);
  160 |       expect(linkRes.ok()).toBe(false);
  161 |       expect(linkRes.status()).toBeGreaterThanOrEqual(400);
  162 | 
  163 |       // A tries to list applicants on B's job → not 200
  164 |       const applicantsRes = await ctxA.request.get(`/api/hr/jobs/${tenantB.jobId}/applicants`);
  165 |       expect(applicantsRes.ok()).toBe(false);
  166 |       expect(applicantsRes.status()).toBeGreaterThanOrEqual(400);
  167 | 
  168 |       // A tries to patch B's job status → not 200
  169 |       const statusRes = await ctxA.request.patch(`/api/hr/jobs/${tenantB.jobId}/status`, {
  170 |         data: { status: "closed" },
  171 |       });
  172 |       expect(statusRes.ok()).toBe(false);
  173 |       expect(statusRes.status()).toBeGreaterThanOrEqual(400);
  174 | 
  175 |       // A tries to update B's job content → not 200
  176 |       const updateRes = await ctxA.request.patch(`/api/hr/jobs/${tenantB.jobId}`, {
  177 |         data: {
  178 |           title: "Hijacked",
  179 |           description:
  180 |             "This update must be rejected by the company scope guard before it touches the DB.",
  181 |           required_skills: [],
  182 |           hard_requirements: [],
  183 |           status: "active",
  184 |         },
  185 |       });
  186 |       expect(updateRes.ok()).toBe(false);
  187 |       expect(updateRes.status()).toBeGreaterThanOrEqual(400);
  188 | 
  189 |       // Sanity check: Tenant B's job still untouched.
  190 |       const { data: stillB } = await admin
  191 |         .from("job_postings")
  192 |         .select("title, status")
  193 |         .eq("id", tenantB.jobId)
  194 |         .single();
  195 |       expect(stillB?.title).toBe(tenantB.jobTitle);
  196 |       expect(stillB?.status).toBe("active");
  197 |     } finally {
  198 |       await ctxA.close();
  199 |     }
  200 |   });
  201 | 
  202 |   test("candidate inserted into company B does NOT appear in company A's applicants view", async ({
  203 |     browser,
  204 |   }) => {
  205 |     const ctxA = await browser.newContext();
  206 |     try {
  207 |       const pageA = await signInAs(ctxA, tenantA.email, tenantA.password);
  208 | 
  209 |       // A opens its OWN job's applicants page (not B's) to confirm RLS + channel
  210 |       // filter keeps B's candidates off of A's screen.
  211 |       await pageA.goto(`/hr/jobs/${tenantA.jobId}/applicants`);
> 212 |       await expect(pageA.getByText(tenantA.jobTitle)).toBeVisible({ timeout: 15000 });
      |                                                       ^ Error: expect(locator).toBeVisible() failed
  213 | 
  214 |       const leakName = `Leak Candidate ${Date.now()}`;
  215 | 
  216 |       // Insert a candidate directly into B's job via service role.
  217 |       const { error: insertErr } = await admin.from("candidates").insert({
  218 |         job_posting_id: tenantB.jobId,
  219 |         full_name: leakName,
  220 |         phone_number: "+998900000001",
  221 |         status: "analyzed",
  222 |         match_score: 90,
  223 |         one_line_summary: "Should never appear on tenant A",
  224 |         strengths: ["IsolationTest"],
  225 |         gaps: [],
  226 |         language_detected: "ru",
  227 |       });
  228 |       expect(insertErr).toBeNull();
  229 | 
  230 |       // Wait a moment for any Realtime events to propagate.
  231 |       await pageA.waitForTimeout(3000);
  232 | 
  233 |       // Tenant A must NOT see the name.
  234 |       await expect(pageA.getByText(leakName)).toHaveCount(0);
  235 |     } finally {
  236 |       await ctxA.close();
  237 |     }
  238 |   });
  239 | });
  240 | 
```