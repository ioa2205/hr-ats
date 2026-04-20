import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

interface InviteEmailParams {
  to: string;
  companyName: string;
  role: string;
  inviteUrl: string;
  inviterName: string;
}

/**
 * Send an invite email via Resend HTTP API.
 * Gracefully skips if RESEND_API_KEY is not configured.
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    logger.warn("[email] RESEND_API_KEY not configured — skipping invite email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: `You're invited to join ${params.companyName}`,
        html: buildInviteHtml(params),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "[email] invite send failed");
      return false;
    }

    logger.info({ to: params.to, company: params.companyName }, "[email] invite sent");
    return true;
  } catch (err) {
    logger.error({ err }, "[email] invite send error");
    return false;
  }
}

function buildInviteHtml({ inviterName, companyName, role, inviteUrl }: InviteEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin: 0 0 8px; color: #1c1b1f; font-size: 20px;">You're invited!</h2>
    <p style="color: #49454f; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">
      <strong>${escapeHtml(inviterName)}</strong> has invited you to join
      <strong>${escapeHtml(companyName)}</strong> as <strong>${escapeHtml(role)}</strong>.
    </p>
    <a href="${escapeHtml(inviteUrl)}"
       style="display: inline-block; background: #6750a4; color: #ffffff; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 500; font-size: 14px;">
      Accept invitation
    </a>
    <p style="color: #79747e; font-size: 12px; margin-top: 24px; line-height: 1.4;">
      If you didn't expect this invitation, you can safely ignore this email.
      This link will expire in 7 days.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
