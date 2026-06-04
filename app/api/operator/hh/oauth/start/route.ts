import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createHhPlatformOAuthState } from "@/lib/sourcing/connectors/hh/oauth-state";

export const runtime = "nodejs";

// GET /api/operator/hh/oauth/start — operator authorizes the PLATFORM-WIDE
// fallback hh.uz employer account. The shared callback handles both scopes, so
// only one redirect_uri needs registering at dev.hh.ru.
export async function GET() {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) {
    return NextResponse.json({ error: "hh_not_configured" }, { status: 503 });
  }

  const redirectUri = env.HH_REDIRECT_URI ?? `${env.APP_URL}/api/hr/hh/oauth/callback`;
  const url = new URL(env.HH_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.HH_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", createHhPlatformOAuthState(auth.user.id));

  return NextResponse.redirect(url);
}
