import { NextResponse, type NextRequest } from "next/server";
import { phoneOtpStartSchema } from "@/lib/validations/auth";
import { generateOtp, storeOtp } from "@/lib/auth/otp";
import { sendSms } from "@/lib/auth/eskiz";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = phoneOtpStartSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const { phone } = parsed.data;

  // Rate limit: max 3 OTP requests per phone per hour
  const rl = await rateLimit({
    key: `otp:phone:${phone}`,
    limit: 3,
    windowSeconds: 3600,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "otp_rate_limited", retryAfter: rl.retryAfter },
      { status: 429 },
    );
  }

  // Also rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipRl = await rateLimit({
    key: `otp:ip:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });

  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "otp_rate_limited", retryAfter: ipRl.retryAfter },
      { status: 429 },
    );
  }

  // If this phone is already linked to a verified user, do NOT send an SMS
  // but return the same success shape so an attacker cannot distinguish
  // registered from unregistered phone numbers. The legitimate owner of an
  // existing account should use the login flow instead.
  const supabase = createAdminClient();
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .not("phone_verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    logger.info({ phone }, "[auth] OTP start suppressed for existing phone");
    return NextResponse.json({ ok: true });
  }

  // Generate and store OTP
  const code = generateOtp();
  await storeOtp(phone, code);

  // Send SMS
  const result = await sendSms(phone, `HR ATS: ${code} — kod tasdiqlash uchun.`);

  if (!result.ok) {
    logger.error({ phone }, "[auth] SMS send failed");
    return NextResponse.json({ error: "sms_failed" }, { status: 502 });
  }

  logger.info({ phone }, "[auth] OTP sent");
  return NextResponse.json({ ok: true });
}
