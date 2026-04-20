import type { Locale, TranslationKey } from "@/lib/i18n/types";

export type ShareChannel = "telegram" | "whatsapp" | "linkedin" | "email";

export interface ShareContext {
  title: string;
  company: string;
  url: string;
  locale: Locale;
}

export type TFn = (key: TranslationKey) => string;

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

const COPY_KEYS: Record<ShareChannel, TranslationKey> = {
  telegram: "hr.job.share.copy_telegram",
  whatsapp: "hr.job.share.copy_whatsapp",
  linkedin: "hr.job.share.copy_linkedin",
  email: "hr.job.share.copy_email_body",
};

export function shareMessage(
  channel: ShareChannel,
  ctx: ShareContext,
  t: TFn,
): string {
  const template = t(COPY_KEYS[channel]);
  return fill(template, {
    title: ctx.title,
    company: ctx.company,
    url: ctx.url,
  });
}

export function emailSubject(ctx: ShareContext, t: TFn): string {
  return fill(t("hr.job.share.copy_email_subject"), {
    title: ctx.title,
    company: ctx.company,
  });
}

/**
 * Builds an external share URL for the given channel.
 *
 * - Telegram: `https://t.me/share/url?url=…&text=…` — text contains the
 *   pre-filled body, url ensures Telegram unfurls the OG preview.
 * - WhatsApp: `https://wa.me/?text=…` — body includes the URL inline.
 * - LinkedIn: `share-offsite/?url=…` — preview is sourced from OG tags.
 * - Email: `mailto:?subject=…&body=…`.
 */
export function shareHref(
  channel: ShareChannel,
  ctx: ShareContext,
  t: TFn,
): string {
  const message = shareMessage(channel, ctx, t);
  switch (channel) {
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(ctx.url)}&text=${encodeURIComponent(message)}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ctx.url)}`;
    case "email": {
      const subject = emailSubject(ctx, t);
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    }
  }
}
