import { NextResponse } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { checkHhHealth, disconnectPlatformHh, isHhConfigured } from "@/lib/sourcing/connectors/hh";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// GET /api/operator/hh/connection — platform-wide hh connection health (live
// /me probe). DELETE — disable the platform fallback connection.
export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // No companyId ⇒ platform scope. baseConfigured tells the UI whether the
  // OAuth app credentials exist (Connect can only work when they do).
  const health = await checkHhHealth();
  return NextResponse.json({ health, baseConfigured: isHhConfigured() });
}

export async function DELETE() {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await disconnectPlatformHh();
  logger.info({ actor: auth.user.id }, "[sourcing] hh platform connection disabled");
  return NextResponse.json({ ok: true });
}
