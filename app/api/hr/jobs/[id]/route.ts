import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { jobPostingSchema } from "@/lib/validations/job";
import { fillMissingLocales } from "@/lib/gemini/translate-posting";
import { logger } from "@/lib/logger";
import type { HardRequirement } from "@/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;
    const body = await request.json();

    const updateSchema = jobPostingSchema.partial();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Verify the job belongs to the caller's company before mutating.
    const { data: existing } = await supabaseAdmin
      .from("job_postings")
      .select(
        "id,title,title_ru,title_uz,title_en,description,description_ru,description_uz,description_en,required_skills,hard_requirements",
      )
      .eq("id", id)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Merge submitted fields over existing values, then run auto-translate to
    // catch any locale the user blanked out or never provided.
    const incomingReqs = (parsed.data.hard_requirements ?? existing.hard_requirements) as unknown as HardRequirement[];

    let filled;
    try {
      filled = await fillMissingLocales({
        title_ru: parsed.data.title_ru ?? existing.title_ru,
        title_uz: parsed.data.title_uz ?? existing.title_uz,
        title_en: parsed.data.title_en ?? existing.title_en,
        description_ru: parsed.data.description_ru ?? existing.description_ru,
        description_uz: parsed.data.description_uz ?? existing.description_uz,
        description_en: parsed.data.description_en ?? existing.description_en,
        required_skills: parsed.data.required_skills ?? existing.required_skills,
        hard_requirements: incomingReqs,
      });
    } catch (err) {
      logger.error({ err }, "[api/hr/jobs/:id] auto-translate failed");
      return NextResponse.json({ error: "translate_failed" }, { status: 502 });
    }

    const updateData: Record<string, unknown> = {
      title_ru: filled.title_ru,
      title_uz: filled.title_uz,
      title_en: filled.title_en,
      description_ru: filled.description_ru,
      description_uz: filled.description_uz,
      description_en: filled.description_en,
      hard_requirements: filled.hard_requirements as unknown as Record<string, unknown>,
    };
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.required_skills !== undefined) {
      updateData.required_skills = filled.required_skills;
    }

    const { error } = await supabaseAdmin
      .from("job_postings")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", access.companyId);

    if (error) {
      logger.error({ err: error }, "[api/hr/jobs/:id] update failed");
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "job_posting.updated",
      entity_type: "job_posting",
      entity_id: id,
      metadata: { fields: Object.keys(updateData) },
    });

    revalidatePath("/hr/jobs");
    revalidatePath(`/hr/jobs/${id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[api/hr/jobs/:id] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
