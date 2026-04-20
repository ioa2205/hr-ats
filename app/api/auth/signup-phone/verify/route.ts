import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { phoneOtpVerifySchema, phoneSignupCompleteSchema } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/auth/otp";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Two-purpose endpoint:
 *
 * 1. action=verify — verify OTP code only
 *    Body: { action: "verify", phone, code }
 *    Returns: { ok: true, verified: true }
 *
 * 2. action=complete — create user account (phone already verified)
 *    Body: { action: "complete", phone, email, full_name }
 *    Returns: { ok: true, redirect: "/onboarding" }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const action = body.action as string;

  if (action === "verify") {
    return handleVerify(body);
  }

  if (action === "complete") {
    return handleComplete(body);
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

async function handleVerify(body: Record<string, unknown>): Promise<NextResponse> {
  const parsed = phoneOtpVerifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);

  if (!result.valid) {
    const statusMap: Record<string, number> = {
      expired: 410,
      too_many_attempts: 429,
      not_found: 404,
      invalid_code: 400,
    };
    return NextResponse.json(
      { error: `otp_${result.error}` },
      { status: statusMap[result.error!] ?? 400 },
    );
  }

  return NextResponse.json({ ok: true, verified: true });
}

async function handleComplete(body: Record<string, unknown>): Promise<NextResponse> {
  const parsed = phoneSignupCompleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { phone, email, full_name } = parsed.data;
  const supabase = createAdminClient();

  // Require a recently-verified OTP for this phone before creating an account.
  // Why: without this check, /auth/signup-phone/verify?action=complete would
  // mint a fully-confirmed auth user for any phone/email pair without proof
  // that the phone was ever verified.
  const otpCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: verifiedOtp } = await supabase
    .from("phone_otp_attempts")
    .select("id, consumed_at")
    .eq("phone", phone)
    .not("consumed_at", "is", null)
    .gte("consumed_at", otpCutoff)
    .order("consumed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!verifiedOtp) {
    logger.warn({ phone }, "[auth] phone signup complete without verified OTP");
    return NextResponse.json({ error: "otp_not_verified" }, { status: 403 });
  }

  // Reject if this phone already has a verified account (prevents OTP-row
  // reuse for account-takeover of an existing profile).
  const { data: existingPhone } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .not("phone_verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json({ error: "phone_taken" }, { status: 409 });
  }

  // Check email not already taken
  const { data: existingEmail } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existingEmail) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  // Create user via admin API with a random password (they can set one later)
  const autoPassword = randomBytes(32).toString("base64url");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: autoPassword,
    email_confirm: true, // Skip email verification — phone is verified
    user_metadata: {
      full_name,
      phone,
      phone_verified: true,
    },
  });

  if (authError) {
    logger.error({ err: authError.message, email, phone }, "[auth] admin createUser failed");
    if (authError.message.toLowerCase().includes("already")) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }

  // Update profile with verified phone
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone,
      phone_verified_at: new Date().toISOString(),
    })
    .eq("id", authData.user.id);

  if (profileError) {
    logger.error(
      { err: profileError, userId: authData.user.id },
      "[auth] profile phone update failed",
    );
  }

  // Generate a magic link to sign them in
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData) {
    logger.error({ err: linkError?.message }, "[auth] magic link generation failed");
    // Account was created — they can still log in via the login page
    return NextResponse.json({
      ok: true,
      redirect: "/auth/login?notice=account_created",
    });
  }

  // Extract the OTP token from the generated link properties
  const token = linkData.properties?.hashed_token;

  if (token) {
    return NextResponse.json({
      ok: true,
      redirect: `/auth/callback?token_hash=${encodeURIComponent(token)}&type=magiclink&next=/onboarding`,
    });
  }

  // Fallback: just redirect to login
  return NextResponse.json({
    ok: true,
    redirect: "/auth/login?notice=account_created",
  });
}
