import { NextResponse } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { checkHhHealth } from "@/lib/sourcing/connectors/hh";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const health = await checkHhHealth();
  return NextResponse.json({ health });
}
