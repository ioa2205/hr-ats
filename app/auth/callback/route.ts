import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = env.APP_URL || origin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    logger.warn({ err: errorParam, desc: errorDescription }, "[auth] callback received error");
    return NextResponse.redirect(`${appOrigin}/auth/login?error=${encodeURIComponent(errorParam)}`);
  }

  const supabase = await createClient();

  // Handle token_hash verification (magic links from admin.generateLink)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email",
    });

    if (error) {
      logger.warn({ err: error.message }, "[auth] token_hash verification failed");
      return NextResponse.redirect(
        `${appOrigin}/auth/login?error=${encodeURIComponent("verification_failed")}`,
      );
    }

    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
    return NextResponse.redirect(`${appOrigin}${safeNext}`);
  }

  // Handle code exchange (OAuth / email confirmation)
  if (!code) {
    return NextResponse.redirect(`${appOrigin}/auth/login?error=missing_code`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn({ err: error.message }, "[auth] code exchange failed");
    return NextResponse.redirect(
      `${appOrigin}/auth/login?error=${encodeURIComponent("exchange_failed")}`,
    );
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
  return NextResponse.redirect(`${appOrigin}${safeNext}`);
}
