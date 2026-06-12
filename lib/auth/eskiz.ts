import { logger } from "@/lib/logger";

const ESKIZ_API_URL = process.env.ESKIZ_API_URL ?? "https://notify.eskiz.uz/api";
const ESKIZ_API_KEY = process.env.ESKIZ_API_KEY ?? "";
const ESKIZ_SENDER_NAME = process.env.ESKIZ_SENDER_NAME ?? "4546";

interface EskizTokenResponse {
  message: string;
  data: { token: string };
  token_type: string;
}

interface EskizSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  if (!ESKIZ_API_KEY) {
    throw new Error("[eskiz] ESKIZ_API_KEY is not configured");
  }

  const res = await fetch(`${ESKIZ_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ESKIZ_API_KEY, password: ESKIZ_API_KEY }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text }, "[eskiz] auth failed");
    throw new Error("[eskiz] authentication failed");
  }

  const data = (await res.json()) as EskizTokenResponse;
  // Token valid for ~29 days; cache with 24h margin
  cachedToken = {
    value: data.data.token,
    expiresAt: Date.now() + 28 * 24 * 60 * 60 * 1000,
  };

  return cachedToken.value;
}

export async function sendSms(phone: string, message: string): Promise<EskizSendResult> {
  // Local development convenience: log the OTP instead of sending a real SMS so
  // the phone-signup flow stays usable without Eskiz credentials. This branch
  // ONLY runs in development — never in production.
  if (process.env.NODE_ENV === "development") {
    logger.info({ phone, message }, "[eskiz] DEV MODE — SMS not sent (logged instead)");
    return { ok: true, messageId: "dev-mode" };
  }

  // In production we must NOT pretend an SMS was sent. If credentials are
  // missing, fail honestly so callers can surface a clear error instead of
  // dead-ending the user on a code that never arrives.
  if (!ESKIZ_API_KEY) {
    logger.error({ phone }, "[eskiz] SMS not configured — ESKIZ_API_KEY missing");
    return { ok: false, error: "sms_not_configured" };
  }

  const token = await getToken();

  const formData = new FormData();
  formData.append("mobile_phone", phone.replace("+", ""));
  formData.append("message", message);
  formData.append("from", ESKIZ_SENDER_NAME);

  const res = await fetch(`${ESKIZ_API_URL}/message/sms/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text, phone }, "[eskiz] send failed");

    // If auth expired, clear cache and retry once
    if (res.status === 401) {
      cachedToken = null;
      const retryToken = await getToken();
      const retryForm = new FormData();
      retryForm.append("mobile_phone", phone.replace("+", ""));
      retryForm.append("message", message);
      retryForm.append("from", ESKIZ_SENDER_NAME);

      const retryRes = await fetch(`${ESKIZ_API_URL}/message/sms/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${retryToken}` },
        body: retryForm,
      });

      if (!retryRes.ok) {
        return { ok: false, error: "sms_send_failed" };
      }
      const retryData = await retryRes.json();
      return { ok: true, messageId: retryData.id };
    }

    return { ok: false, error: "sms_send_failed" };
  }

  const data = await res.json();
  return { ok: true, messageId: data.id };
}
