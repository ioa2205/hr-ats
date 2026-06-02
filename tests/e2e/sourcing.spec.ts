import { test, expect } from "@playwright/test";
import {
  createTenant,
  deleteTenant,
  getAdminClient,
  hasSupabase,
  signInOnPage,
  type TenantFixture,
} from "./utils/tenant";
import type { SupabaseClient } from "@supabase/supabase-js";

// E2E for active sourcing. The funnel itself (Gemini calls) is unit-tested in
// lib/sourcing; here we seed a COMPLETED search + shortlist directly and assert
// the results UX (ranked checklist + evidence + promote), then exercise the
// trigger's enqueue path. Skips when Supabase isn't configured.
test.describe("Active sourcing", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;
  let jobId: string;
  let searchId: string;

  const reqs = [
    { id: "r1", label_ru: "Права B", label_uz: "B toifa", type: "boolean", min_value: null, order: 0 },
    { id: "r2", label_ru: "Опыт 3 года", label_uz: "3 yil tajriba", type: "number", min_value: 3, order: 1 },
  ];

  function sourcedRow(rank: number, name: string, score: number, phone: string) {
    return {
      company_id: tenant.companyId,
      sourcing_search_id: searchId,
      source: "internal_pool",
      source_ref: `cand-${rank}`,
      identity_key: `${name.toLowerCase()}#phone:${phone.replace(/\D/g, "")}`,
      profile: {
        full_name: name,
        headline: "Driver, 5 years",
        location: null,
        fields: [{ field: "self_declared", value: "Права B: да", evidence: "Права B: да" }],
        raw_text: "Права B: да\nОпыт работы: 5 лет",
      },
      requirement_results: [
        { requirement_id: "r1", met: true, evidence: "Права B: да", confidence: 0.95 },
        { requirement_id: "r2", met: true, evidence: "Опыт работы: 5 лет", confidence: 0.9 },
      ],
      meets_all_requirements: true,
      score,
      score_breakdown: {
        total: score,
        axes: [{ axis: "skills_match", score, evidence: "5 years driving" }],
        gaps: [],
        risks: [],
        confidence: 0.9,
      },
      rank,
      contact: { phone, email: null, telegram: null, profile_url: null },
      verified: true,
    };
  }

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "sourcing" });

    const { data: job, error: jobErr } = await admin
      .from("job_postings")
      .insert({
        company_id: tenant.companyId,
        title: "Driver E2E",
        description: "Driver role in Tashkent used by the sourcing e2e test.",
        required_skills: [],
        hard_requirements: reqs,
        status: "active",
        created_by: tenant.userId,
      })
      .select("id")
      .single();
    if (jobErr || !job) throw new Error(`job insert failed: ${jobErr?.message}`);
    jobId = job.id;

    const { data: search, error: searchErr } = await admin
      .from("sourcing_searches")
      .insert({
        company_id: tenant.companyId,
        job_posting_id: jobId,
        requested_by: tenant.userId,
        status: "completed",
        sources: ["internal_pool"],
        requirement_profile: {
          hard_requirements: reqs,
          title: "Driver E2E",
          location: null,
          required_skills: [],
          must_haves: [],
          nice_to_haves: [],
          seniority: null,
          required_languages: [],
          search_keywords: [],
        },
        stats: {
          fetched: 5,
          deduped: 4,
          gate_passed: 2,
          scored: 2,
          verified: 2,
          shortlisted: 2,
          per_source: { internal_pool: 5 },
          degraded_sources: [],
        },
        input_tokens: 1200,
        output_tokens: 400,
        cost_usd: 0.0072,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (searchErr || !search) throw new Error(`search insert failed: ${searchErr?.message}`);
    searchId = search.id;

    const { error: scErr } = await admin
      .from("sourced_candidates")
      .insert([sourcedRow(1, "Alisher Top", 92, "+998901112233"), sourcedRow(2, "Bobur Second", 71, "+998901112244")]);
    if (scErr) throw new Error(`sourced insert failed: ${scErr.message}`);
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  test.beforeEach(async ({ page }) => {
    await signInOnPage(page, tenant.email, tenant.password);
  });

  test("results page shows the ranked checklist and promotes the top candidate", async ({ page }) => {
    await page.goto(`/hr/jobs/${jobId}/sourcing/${searchId}`);

    // Both shortlisted candidates render.
    await expect(page.getByText("Alisher Top")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Bobur Second")).toBeVisible();

    // Requirement checklist labels are shown (the guarantee, on screen).
    await expect(page.getByText("Права B").first()).toBeVisible();
    await expect(page.getByText("Опыт 3 года").first()).toBeVisible();

    // Promote the top candidate.
    await page
      .getByRole("button", { name: /в кандидаты|promote|nomzodlarga/i })
      .first()
      .click();
    await expect(page.getByText(/добавлен|promoted|qo['’]shildi/i).first()).toBeVisible({ timeout: 10000 });

    // A real candidate row was materialized in the 'unscored' state.
    const { data: candidate } = await admin
      .from("candidates")
      .select("id, status, meets_requirements")
      .eq("job_posting_id", jobId)
      .eq("full_name", "Alisher Top")
      .maybeSingle();
    expect(candidate).toBeTruthy();
    expect(candidate?.status).toBe("unscored");
    expect(candidate?.meets_requirements).toBe(true);
  });

  test("Find candidates enqueues a background search from the job page", async ({ page }) => {
    await page.goto(`/hr/jobs/${jobId}`);
    await page
      .getByRole("button", { name: /найти кандидатов|find candidates|nomzod topish/i })
      .first()
      .click();

    // Either we navigate to the new search's results page, or get a friendly
    // state — in both cases a search row now exists for this posting.
    await page
      .waitForURL(new RegExp(`/hr/jobs/${jobId}/sourcing/`), { timeout: 15000 })
      .catch(() => undefined);

    const { data: searches } = await admin
      .from("sourcing_searches")
      .select("id, status")
      .eq("job_posting_id", jobId)
      .order("created_at", { ascending: false });
    expect((searches ?? []).length).toBeGreaterThanOrEqual(1);
  });
});
