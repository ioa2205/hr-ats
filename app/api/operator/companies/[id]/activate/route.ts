import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: company, error: fetchError } = await admin
      .from("companies")
      .select("id, name, status")
      .eq("id", id)
      .single();

    if (fetchError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status === "active") {
      return NextResponse.json({ error: "Company already active" }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from("companies")
      .update({ status: "active" })
      .eq("id", id);

    if (updateError) {
      logger.error({ err: updateError, companyId: id }, "[api/operator/activate] update failed");
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_user_id: auth.user.id,
      company_id: id,
      actor: auth.user.email ?? "operator",
      action: "company.activated",
      entity_type: "company",
      entity_id: id,
      metadata: { company_name: company.name, operator_id: auth.user.id },
    });

    logger.info(
      { companyId: id, operator: auth.user.id },
      "[api/operator/activate] company activated",
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[api/operator/activate] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
