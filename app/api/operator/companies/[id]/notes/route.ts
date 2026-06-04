import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const postSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  pinned: z.boolean().default(false),
});

const patchSchema = z.object({
  id: z.number().int().positive(),
  body: z.string().trim().min(1).max(8000).optional(),
  pinned: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id: companyId } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("operator_company_notes")
    .select("id, body, pinned, author_user_id, created_at, updated_at")
    .eq("company_id", companyId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    logger.error({ err: error }, "[api/operator/companies/notes] fetch failed");
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  // Fetch authors in one go
  const authorIds = Array.from(
    new Set(data?.map((n) => n.author_user_id).filter((v): v is string => Boolean(v)) ?? []),
  );
  const authorMap = new Map<string, { email: string; full_name: string | null }>();
  if (authorIds.length > 0) {
    const { data: authors } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", authorIds);
    for (const a of authors ?? []) {
      authorMap.set(a.id, { email: a.email, full_name: a.full_name });
    }
  }

  const rows = (data ?? []).map((n) => ({
    id: Number(n.id),
    body: n.body as string,
    pinned: n.pinned === true,
    authorUserId: (n.author_user_id as string | null) ?? null,
    author:
      (n.author_user_id && authorMap.get(n.author_user_id as string)?.full_name) ||
      (n.author_user_id && authorMap.get(n.author_user_id as string)?.email) ||
      null,
    createdAt: n.created_at as string,
    updatedAt: n.updated_at as string,
  }));

  return NextResponse.json({ notes: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const { id: companyId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("operator_company_notes")
    .insert({
      company_id: companyId,
      author_user_id: auth.user.id,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
    })
    .select("id")
    .single();

  if (error) {
    logger.error({ err: error }, "[api/operator/companies/notes] insert failed");
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: "operator.note_added",
    entity_type: "operator_company_note",
    entity_id: String(data.id),
    metadata: { pinned: parsed.data.pinned, length: parsed.data.body.length },
  });

  return NextResponse.json({ id: Number(data.id) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const { id: companyId } = await params;
  const admin = createAdminClient();

  // 15-minute edit window; beyond that, edits are locked. Matches spec §4.3.
  const { data: existing } = await admin
    .from("operator_company_notes")
    .select("id, author_user_id, created_at")
    .eq("id", parsed.data.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ageMs = Date.now() - Date.parse(existing.created_at as string);
  const isAuthor = existing.author_user_id === auth.user.id;
  if (parsed.data.body !== undefined) {
    if (!isAuthor || ageMs > 15 * 60 * 1000) {
      return NextResponse.json({ error: "edit_window_closed" }, { status: 403 });
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.body !== undefined) update.body = parsed.data.body;
  if (parsed.data.pinned !== undefined) update.pinned = parsed.data.pinned;

  const { error } = await admin
    .from("operator_company_notes")
    .update(update)
    .eq("id", parsed.data.id)
    .eq("company_id", companyId);
  if (error) {
    logger.error({ err: error }, "[api/operator/companies/notes] update failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: "operator.note_edited",
    entity_type: "operator_company_note",
    entity_id: String(parsed.data.id),
    metadata: { pinned: parsed.data.pinned, body_changed: parsed.data.body !== undefined },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const { id: companyId } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("operator_company_notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("company_id", companyId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: "operator.note_deleted",
    entity_type: "operator_company_note",
    entity_id: String(parsed.data.id),
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
