import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  company_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the caller is a member of the target company
  const { data: membership } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", parsed.data.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ current_company_id: parsed.data.company_id })
    .eq("id", user.id);

  if (error) {
    logger.error({ err: error.message }, "[api/company/switch] update failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company_id: parsed.data.company_id });
}
