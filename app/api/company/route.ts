import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  logo_url: z.string().trim().url().max(1000).nullable().optional(),
  default_locale: z.enum(["ru", "uz", "en"]),
});

export async function PATCH(request: NextRequest) {
  const access = await requireCompanyAccessApi({ roles: ["owner", "admin"] });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logo_url ?? null,
      default_locale: parsed.data.default_locale,
    })
    .eq("id", access.companyId);

  if (error) {
    logger.error({ err: error.message }, "[api/company] update failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "company.updated",
    entity_type: "company",
    entity_id: access.companyId,
    metadata: { fields: ["name", "logo_url", "default_locale"] },
  });

  return NextResponse.json({ ok: true });
}
