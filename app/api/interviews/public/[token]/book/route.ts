import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { BookSlotSchema } from "@/lib/interviews/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await rateLimit({
      key: `interview-book:${ip}:${token}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retry_after: rl.retryAfter ?? 3600 },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = BookSlotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_failed" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("book_interview_slot", {
      p_token: token,
      p_slot_id: parsed.data.slot_id,
    });

    if (error) {
      logger.error({ context: "interview-book", err: error, token }, "RPC failed");
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    const result = data as unknown as { ok: boolean; error?: string };
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.error ?? "unknown" }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "interview-book", err, token }, "Unhandled error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
