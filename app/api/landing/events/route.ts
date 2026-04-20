import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const eventSchema = z.object({
  session_id: z.string().min(8).max(128),
  locale: z.enum(["ru", "uz", "en"]),
  event: z.enum([
    "page_view",
    "cta_click",
    "demo_open",
    "demo_complete",
    "pricing_compare_open",
    "faq_expand",
    "contact_submit",
  ]),
  target: z.string().max(120).optional().nullable(),
  utm_source: z.string().max(120).optional().nullable(),
  utm_section: z.string().max(120).optional().nullable(),
  path: z.string().max(512).optional().nullable(),
});

const payloadSchema = z.object({
  events: z.array(eventSchema).min(1).max(25),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "unknown";

  const rl = await rateLimit({
    key: `landing-events:ip:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ua = h.get("user-agent")?.slice(0, 400) ?? null;
  const ipCountry = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null;

  const rows = parsed.data.events.map((e) => ({
    session_id: e.session_id,
    locale: e.locale,
    event: e.event,
    target: e.target ?? null,
    utm_source: e.utm_source ?? null,
    utm_section: e.utm_section ?? null,
    user_agent: ua,
    ip_country: ipCountry,
    path: e.path ?? null,
  }));

  const supabase = createAdminClient();
  const { error } = await supabase.from("landing_events").insert(rows);
  if (error) {
    if (!/does not exist|relation .* not found/i.test(error.message)) {
      logger.warn(`[landing-events] insert failed: ${error.message}`);
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
