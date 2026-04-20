import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { t } from "@/lib/i18n";

// Trilingual subject + body templates for notification events. Kept as plain
// strings (no React Email dep) — simple enough to render inline.

export type NotificationEvent =
  | "new_application"
  | "top_pick"
  | "interview_booked"
  | "interview_declined"
  | "ai_failed"
  | "quota_warning";

interface TemplateInput {
  locale: Locale;
  title: string;
  body?: string | null;
  actionUrl?: string;
  companyName?: string;
}

const SUBJECT_KEYS: Record<NotificationEvent, TranslationKey | undefined> = {
  new_application: "notifications.email.subject_new_application",
  top_pick: "notifications.email.subject_top_pick",
  interview_booked: "notifications.email.subject_interview_booked",
  interview_declined: "notifications.email.subject_interview_declined",
  ai_failed: "notifications.email.subject_ai_failed",
  quota_warning: "notifications.email.subject_quota_warning",
};

export function renderNotificationEmail(
  event: NotificationEvent,
  input: TemplateInput,
): { subject: string; html: string } {
  const subjectKey = SUBJECT_KEYS[event];
  const subject = subjectKey
    ? t(subjectKey, input.locale, { title: input.title })
    : input.title;
  const html = buildHtml(input);
  return { subject, html };
}

function buildHtml({ locale, title, body, actionUrl, companyName }: TemplateInput): string {
  const openCta = t("notifications.email.open_cta", locale);
  const footer = t("notifications.email.footer", locale);
  const brand = companyName ?? "TezHR";
  return `<!DOCTYPE html>
<html lang="${locale}">
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin: 0 0 8px; color: #1c1b1f; font-size: 20px;">${escapeHtml(title)}</h2>
    ${body ? `<p style="color: #49454f; margin: 0 0 24px; font-size: 14px; line-height: 1.5;">${escapeHtml(body)}</p>` : ""}
    ${
      actionUrl
        ? `<a href="${escapeHtml(actionUrl)}" style="display: inline-block; background: #6750a4; color: #ffffff; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 500; font-size: 14px;">${escapeHtml(openCta)}</a>`
        : ""
    }
    <p style="color: #79747e; font-size: 12px; margin-top: 24px; line-height: 1.4;">${escapeHtml(footer)} · ${escapeHtml(brand)}</p>
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
