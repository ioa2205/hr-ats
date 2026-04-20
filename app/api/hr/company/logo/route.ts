import { NextResponse, type NextRequest } from "next/server";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const MAX_BYTES = 1 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const LOGO_FILENAME = "logo.png";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const access = await requireCompanyAccessApi({ roles: ["owner", "admin"] });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const formData = await req.formData();
  const file = formData.get("logo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "bad_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const admin = createAdminClient();
  const path = `${access.companyId}/${LOGO_FILENAME}`;
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await admin.storage.from("logos").upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });
  if (upErr) {
    logger.error({ err: upErr.message }, "[logo] upload failed");
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("logos").getPublicUrl(path);

  const bust = `${publicUrl}?t=${Date.now()}`;
  const { error: updErr } = await admin
    .from("companies")
    .update({ logo_url: bust })
    .eq("id", access.companyId);
  if (updErr) {
    logger.error({ err: updErr.message }, "[logo] company update failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    company_id: access.companyId,
    actor: "hr",
    actor_user_id: access.user.id,
    action: "settings.company.logo_uploaded",
    entity_type: "company",
    entity_id: access.companyId,
    metadata: { path },
  });

  return NextResponse.json({ ok: true, logo_url: bust });
}

export async function DELETE() {
  const access = await requireCompanyAccessApi({ roles: ["owner", "admin"] });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const path = `${access.companyId}/${LOGO_FILENAME}`;
  await admin.storage.from("logos").remove([path]);
  const { error } = await admin
    .from("companies")
    .update({ logo_url: null })
    .eq("id", access.companyId);
  if (error) {
    logger.error({ err: error.message }, "[logo] clear failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    company_id: access.companyId,
    actor: "hr",
    actor_user_id: access.user.id,
    action: "settings.company.logo_removed",
    entity_type: "company",
    entity_id: access.companyId,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
