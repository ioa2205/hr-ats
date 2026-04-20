import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send one email via Resend's HTTP API. Returns a Resend message ID on
 * success, or an error string on failure. Caller decides whether to retry
 * based on `ok`.
 */
export async function sendEmail({ to, subject, html, from }: SendArgs): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from ?? env.EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `resend_${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, messageId: data.id };
  } catch (err) {
    logger.error({ err, to }, "[email] send exception");
    return { ok: false, error: (err as Error).message.slice(0, 200) };
  }
}
