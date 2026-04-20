import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(html: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_INBOX_CHAT_ID;

  if (!token || !chatId) {
    logger.info("[telegram] notification skipped: bot not configured");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status, body }, "[telegram] sendMessage failed");
    }
  } catch (err) {
    logger.warn({ err }, "[telegram] sendMessage threw");
  }
}

interface ContactPayload {
  name: string;
  email: string;
  company: string | null;
  message: string;
  locale: string;
}

export async function notifyContactMessage(payload: ContactPayload): Promise<void> {
  const lines = [
    "📬 <b>New TezHR contact</b>",
    "",
    `<b>Name:</b> ${escapeHtml(payload.name)}`,
    `<b>Email:</b> ${escapeHtml(payload.email)}`,
  ];
  if (payload.company) {
    lines.push(`<b>Company:</b> ${escapeHtml(payload.company)}`);
  }
  lines.push(`<b>Locale:</b> ${escapeHtml(payload.locale)}`);
  lines.push("");
  lines.push("<b>Message:</b>");
  lines.push(escapeHtml(payload.message));

  await sendTelegramMessage(lines.join("\n"));
}
