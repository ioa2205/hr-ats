import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const schema = z.object({
  action: z.enum(["acknowledge", "resolve"]),
  note: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const incidentId = Number(rawId);
  if (!Number.isFinite(incidentId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_failed" }, { status: 400 });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> =
    parsed.data.action === "acknowledge"
      ? { status: "acknowledged", ack_by_user_id: auth.user.id, ack_at: nowIso }
      : {
          status: "resolved",
          resolved_by_user_id: auth.user.id,
          resolved_at: nowIso,
          resolution_note: parsed.data.note ?? null,
        };

  if (parsed.data.action === "resolve" && (!parsed.data.note || parsed.data.note.length === 0)) {
    return NextResponse.json({ error: "note_required" }, { status: 400 });
  }

  const { error } = await admin.from("operator_incidents").update(update).eq("id", incidentId);
  if (error) {
    logger.error({ err: error }, "[api/operator/incidents/patch] failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action:
      parsed.data.action === "acknowledge"
        ? "operator.incident_acknowledged"
        : "operator.incident_resolved",
    entity_type: "operator_incident",
    entity_id: String(incidentId),
    metadata: { note: parsed.data.note ?? null },
  });

  return NextResponse.json({ ok: true });
}
