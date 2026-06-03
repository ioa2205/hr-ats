import { z } from "zod/v4";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GOOGLE_GEMINI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  SENTRY_DSN: z.url().optional(),
  APP_URL: z.url(),
  ESKIZ_API_KEY: z.string().min(1).optional(),
  ESKIZ_API_URL: z.url().optional(),
  ESKIZ_SENDER_NAME: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("TezHR <noreply@resend.dev>"),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_INBOX_CHAT_ID: z.string().min(1).optional(),
  // Active sourcing — hh.uz (HeadHunter) outbound connector (Phase 2, optional).
  // Sourcing falls back to the internal pool when the id/secret are absent.
  HH_CLIENT_ID: z.string().min(1).optional(),
  HH_CLIENT_SECRET: z.string().min(1).optional(),
  // One-time employer OAuth token (only if your hh access tier gates resume
  // search behind an authorized employer). When set, it takes precedence.
  HH_REFRESH_TOKEN: z.string().min(1).optional(),
  HH_API_BASE_URL: z.url().default("https://api.hh.ru"),
  HH_TOKEN_URL: z.url().default("https://api.hh.ru/token"),
  HH_USER_AGENT: z.string().min(1).default("TezHR/1.0 (+https://tezhr.uz)"),
  // Area to search (e.g. Uzbekistan / Tashkent). Find ids via GET /areas.
  // Unset ⇒ all areas.
  HH_AREA_ID: z.string().min(1).optional(),
  // Active sourcing — Telegram outbound connector (Phase 3, optional). Monitors
  // an explicit allow-list of public job/CV channels via an MTProto USER client
  // (GramJS). Configured only when api id + hash + session + channels are all
  // present; absent ⇒ sourcing falls back to internal-pool / hh. NOTE: distinct
  // from TELEGRAM_BOT_TOKEN (inbox notifications) above.
  TELEGRAM_API_ID: z.string().min(1).optional(),
  TELEGRAM_API_HASH: z.string().min(1).optional(),
  // MTProto user session string (StringSession), obtained once via a login
  // script. There is no app-token equivalent — sourcing needs full channel
  // history, which only a user session can read.
  TELEGRAM_SESSION: z.string().min(1).optional(),
  // Comma-separated allow-list of channel handles to monitor (e.g. "ish_uz,hh_vacancy").
  TELEGRAM_CHANNELS: z.string().min(1).optional(),
  // Ignore any post older than this many days (hard recency cutoff).
  TELEGRAM_MAX_AGE_DAYS: z.coerce.number().int().positive().default(45),
  // Hard cap on messages pulled per channel per run.
  TELEGRAM_PER_CHANNEL_LIMIT: z.coerce.number().int().positive().default(200),
  // Click billing — placeholders allowed in dev. instrumentation.ts logs a
  // WARN when the merchant_id is left as the placeholder string in production.
  CLICK_MERCHANT_ID: z.string().min(1).default("CHANGE_ME_CLICK_MERCHANT_ID"),
  CLICK_SERVICE_ID: z.string().min(1).default("CHANGE_ME_CLICK_SERVICE_ID"),
  CLICK_MERCHANT_USER_ID: z.string().min(1).default("CHANGE_ME_CLICK_MERCHANT_USER_ID"),
  CLICK_SECRET_KEY: z.string().min(1).default("CHANGE_ME_CLICK_SECRET_KEY"),
  CLICK_ENV: z.enum(["sandbox", "prod"]).default("sandbox"),
});

type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

export const env: Env = parseEnv();
