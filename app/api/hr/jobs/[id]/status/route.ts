import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

const statusSchema = z.object({
  status: z.enum(["active", "closed"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from("job_postings")
      .select("id")
      .eq("id", id)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("job_postings")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .eq("company_id", access.companyId);

    if (error) {
      logger.error({ err: error }, "[api/hr/jobs/:id/status] update failed");
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: `job_posting.${parsed.data.status === "closed" ? "closed" : "reopened"}`,
      entity_type: "job_posting",
      entity_id: id,
      metadata: { new_status: parsed.data.status },
    });

    revalidatePath("/hr/jobs");
    revalidatePath(`/hr/jobs/${id}`);
    revalidatePath("/hr/dashboard");

    return NextResponse.json({ status: parsed.data.status });
  } catch (err) {
    logger.error({ err }, "[api/hr/jobs/:id/status] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
