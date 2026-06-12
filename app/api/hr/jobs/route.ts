import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { canCreateJob } from "@/lib/companies/quota";
import { jobPostingSchema } from "@/lib/validations/job";
import { fillMissingLocales } from "@/lib/gemini/translate-posting";
import { logger } from "@/lib/logger";
import type { HardRequirement } from "@/types";
import type { Database, Json } from "@/types/supabase";

export async function POST(request: NextRequest) {
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const parsed = jobPostingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    // Quota gate — skipped for drafts saved as 'closed'.
    if (parsed.data.status === "active") {
      const allowed = await canCreateJob(access.companyId);
      if (!allowed.allowed) {
        const status = allowed.reason === "subscription_inactive" ? 403 : 402;
        return NextResponse.json({ error: allowed.reason }, { status });
      }
    }

    // Auto-translate: if any of the six locale fields or requirement labels are
    // blank, call Gemini Flash to fill them in. If every locale is already
    // populated, this is a no-op (no cost).
    let filled;
    try {
      filled = await fillMissingLocales({
        title_ru: parsed.data.title_ru,
        title_uz: parsed.data.title_uz,
        title_en: parsed.data.title_en,
        description_ru: parsed.data.description_ru,
        description_uz: parsed.data.description_uz,
        description_en: parsed.data.description_en,
        required_skills: parsed.data.required_skills,
        hard_requirements: (parsed.data.hard_requirements ?? []) as HardRequirement[],
      });
    } catch (err) {
      logger.error({ err }, "[api/hr/jobs] auto-translate failed");
      return NextResponse.json({ error: "translate_failed" }, { status: 502 });
    }

    const supabaseAdmin = createAdminClient();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

    // optional_questions / open_questions are post-Docker columns absent from
    // the generated types. They are stored verbatim (no auto-translate); the
    // apply form + AI fall back to ru when a locale is blank.
    const insertRow: Database["public"]["Tables"]["job_postings"]["Insert"] & {
      optional_questions?: Json;
      open_questions?: Json;
    } = {
      company_id: access.companyId,
      created_by: access.user.id,
      title: parsed.data.title,
      title_ru: filled.title_ru,
      title_uz: filled.title_uz,
      title_en: filled.title_en,
      description: parsed.data.description,
      description_ru: filled.description_ru,
      description_uz: filled.description_uz,
      description_en: filled.description_en,
      required_skills: filled.required_skills,
      hard_requirements: filled.hard_requirements as unknown as Json,
      optional_questions: parsed.data.optional_questions as unknown as Json,
      open_questions: parsed.data.open_questions as unknown as Json,
      status: parsed.data.status,
      public_token: token,
    };

    const { data: job, error } = await supabaseAdmin
      .from("job_postings")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      logger.error({ err: error }, "[api/hr/jobs] insert failed");
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "job_posting.created",
      entity_type: "job_posting",
      entity_id: job.id,
      metadata: { title: parsed.data.title },
    });

    revalidatePath("/hr/jobs");
    revalidatePath("/hr/dashboard");

    return NextResponse.json({ id: job.id }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "[api/hr/jobs] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
