import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createHhOAuthState } from "@/lib/sourcing/connectors/hh/oauth-state";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
    requireWrite: true,
  });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) {
    return NextResponse.json({ error: "hh_not_configured" }, { status: 503 });
  }

  const redirectUri = env.HH_REDIRECT_URI ?? `${env.APP_URL}/api/hr/hh/oauth/callback`;
  const url = new URL(env.HH_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.HH_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", createHhOAuthState(access.companyId, access.user.id));

  return NextResponse.redirect(url);
}
