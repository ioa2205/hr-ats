import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Resend webhook handler. Verifies the Svix signature header pair, then
 * updates notification_deliveries on `email.bounced` / `email.complained`
 * events and inserts the recipient into notification_suppressions so future
 * dispatches skip them.
 *
 * Required env: RESEND_WEBHOOK_SECRET (Svix endpoint secret, prefixed with
 * `whsec_`). Falls back to 401 when missing or signature mismatch.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("[webhook/resend] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTs = req.headers.get("svix-timestamp");
  const svixSig = req.headers.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  const body = await req.text();
  const signedPayload = `${svixId}.${svixTs}.${body}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");

  // svix-signature header format: "v1,<sig> v1,<sig> ..." — accept any match.
  const provided = svixSig
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter(Boolean);

  let verified = false;
  for (const candidate of provided) {
    try {
      const a = Buffer.from(candidate, "base64");
      const b = Buffer.from(expected, "base64");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        verified = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!verified) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(body) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const admin = createAdminClient();
  const messageId = payload.data?.email_id;
  const recipient =
    typeof payload.data?.to === "string"
      ? payload.data.to
      : Array.isArray(payload.data?.to)
        ? payload.data.to[0]
        : null;

  switch (payload.type) {
    case "email.bounced":
    case "email.complained": {
      const status = payload.type === "email.bounced" ? "bounced" : "suppressed";
      if (messageId) {
        await admin
          .from("notification_deliveries")
          .update({
            status,
            last_error: payload.type,
          })
          .eq("resend_message_id", messageId);
      }
      if (recipient) {
        await admin.from("notification_suppressions").upsert(
          {
            email: recipient,
            reason: payload.type,
          },
          { onConflict: "email" },
        );
      }
      break;
    }
    case "email.delivered": {
      if (messageId) {
        await admin
          .from("notification_deliveries")
          .update({ status: "sent" })
          .eq("resend_message_id", messageId)
          .neq("status", "sent");
      }
      break;
    }
    default:
      // Other Resend event types (email.sent, email.delivered_delayed,
      // email.opened, email.clicked) are acknowledged but not acted on.
      break;
  }

  return NextResponse.json({ ok: true });
}

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
  };
}
