import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const emailOtpTypes = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type EmailOtpType = (typeof emailOtpTypes)[number];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && emailOtpTypes.some((candidate) => candidate === value);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = env.APP_URL || origin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    logger.warn({ err: errorParam, desc: errorDescription }, "[auth] callback received error");
    const loginParams = new URLSearchParams({ error: errorParam, next: safeNext });
    return NextResponse.redirect(`${appOrigin}/auth/login?${loginParams.toString()}`);
  }

  const supabase = await createClient();

  // Handle token_hash verification (magic links from admin.generateLink)
  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      logger.warn({ err: error.message }, "[auth] token_hash verification failed");
      return NextResponse.redirect(
        `${appOrigin}/auth/login?error=${encodeURIComponent("verification_failed")}`,
      );
    }

    return NextResponse.redirect(`${appOrigin}${safeNext}`);
  }

  // Handle code exchange (OAuth / email confirmation)
  if (!code) {
    const loginParams = new URLSearchParams({ error: "missing_code", next: safeNext });
    return NextResponse.redirect(`${appOrigin}/auth/login?${loginParams.toString()}`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn({ err: error.message }, "[auth] code exchange failed");
    const loginParams = new URLSearchParams({ error: "exchange_failed", next: safeNext });
    return NextResponse.redirect(`${appOrigin}/auth/login?${loginParams.toString()}`);
  }

  return NextResponse.redirect(`${appOrigin}${safeNext}`);
}
