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
