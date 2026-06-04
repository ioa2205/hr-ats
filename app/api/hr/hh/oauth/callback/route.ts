import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import {
  exchangeHhAuthorizationCode,
  HhClient,
} from "@/lib/sourcing/connectors/hh/client";
import { saveCompanyHhConnection } from "@/lib/sourcing/connectors/hh";
import { verifyHhOAuthState } from "@/lib/sourcing/connectors/hh/oauth-state";

export const runtime = "nodejs";

function redirectToCompanySettings(status: "connected" | "failed") {
  return NextResponse.redirect(`${env.APP_URL}/hr/settings/company?hh=${status}`);
}

export async function GET(request: NextRequest) {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
    requireWrite: true,
  });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = verifyHhOAuthState(params.get("state"));
  if (!code || !state || state.companyId !== access.companyId || state.userId !== access.user.id) {
    return redirectToCompanySettings("failed");
  }

  try {
    const redirectUri = env.HH_REDIRECT_URI ?? `${env.APP_URL}/api/hr/hh/oauth/callback`;
    const token = await exchangeHhAuthorizationCode({
      code,
      redirectUri,
      clientId: env.HH_CLIENT_ID!,
      clientSecret: env.HH_CLIENT_SECRET!,
      tokenUrl: env.HH_TOKEN_URL,
      userAgent: env.HH_USER_AGENT,
    });

    const client = new HhClient({
      clientId: env.HH_CLIENT_ID!,
      clientSecret: env.HH_CLIENT_SECRET!,
      refreshToken: token.refreshToken,
      accessToken: token.accessToken,
      accessExpiresAt: token.accessExpiresAt,
      apiBaseUrl: env.HH_API_BASE_URL,
      tokenUrl: env.HH_TOKEN_URL,
      userAgent: env.HH_USER_AGENT,
      host: env.HH_HOST,
      areaId: env.HH_AREA_ID,
    });
    const me = await client.getMe().catch(() => undefined);

    await saveCompanyHhConnection({
      companyId: access.companyId,
      userId: access.user.id,
      token,
      me,
    });

    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "sourcing.hh.connected",
      entity_type: "company_hh_connection",
      entity_id: access.companyId,
      metadata: {
        employer_id: me?.employer?.id ?? null,
        employer_name: me?.employer?.name ?? null,
      },
    });

    return redirectToCompanySettings("connected");
  } catch (err) {
    logger.error({ err: String(err), companyId: access.companyId }, "[sourcing] hh oauth callback failed");
    return redirectToCompanySettings("failed");
  }
}
