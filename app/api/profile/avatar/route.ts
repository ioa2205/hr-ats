import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const AVATAR_FILENAME = "avatar.png";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const formData = await req.formData();
  const file = formData.get("avatar");

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
  const path = `${user.id}/${AVATAR_FILENAME}`;
  const bytes = await file.arrayBuffer();

  const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "3600",
  });
  if (upErr) {
    logger.error({ err: upErr.message, userId: user.id }, "[avatar] upload failed");
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);

  const bust = `${publicUrl}?t=${Date.now()}`;
  const { error: updErr } = await admin
    .from("profiles")
    .update({ avatar_url: bust })
    .eq("id", user.id);
  if (updErr) {
    logger.error({ err: updErr.message }, "[avatar] profile update failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.avatar_uploaded",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { path },
  });

  return NextResponse.json({ ok: true, avatar_url: bust });
}

export async function DELETE() {
  const user = await requireUser();
  const admin = createAdminClient();
  const path = `${user.id}/${AVATAR_FILENAME}`;

  await admin.storage.from("avatars").remove([path]);
  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) {
    logger.error({ err: error.message }, "[avatar] clear failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.avatar_removed",
    entity_type: "profile",
    entity_id: user.id,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
