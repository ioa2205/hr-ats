import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { extractRequestContext, writeOperatorAudit } from "@/lib/operator/audit-log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (company.status === "suspended") {
      return NextResponse.json({ error: "Company already suspended" }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from("companies")
      .update({ status: "suspended" })
      .eq("id", id);

    if (updateError) {
      logger.error({ err: updateError, companyId: id }, "[api/operator/suspend] update failed");
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    const { ip, userAgent } = extractRequestContext(request.headers);
    await writeOperatorAudit({
      actorUserId: auth.user.id,
      action: "operator.company.suspend",
      targetCompanyId: id,
      metadata: { company_name: company.name },
      ip,
      userAgent,
    });

    logger.info(
      { companyId: id, operator: auth.user.id },
      "[api/operator/suspend] company suspended",
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[api/operator/suspend] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
