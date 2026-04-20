import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchPublicInterview } from "@/lib/interviews/public-fetch";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchPublicInterview(token);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, request: data });
}
