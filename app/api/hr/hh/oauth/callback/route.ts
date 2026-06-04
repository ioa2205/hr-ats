import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi, requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import {
  exchangeHhAuthorizationCode,
  HhClient,
  type HhMe,
  type HhPersistedTokenState,
} from "@/lib/sourcing/connectors/hh/client";
import { saveCompanyHhConnection, savePlatformHhConnection } from "@/lib/sourcing/connectors/hh";
import { verifyHhOAuthState } from "@/lib/sourcing/connectors/hh/oauth-state";

export const runtime = "nodejs";

type Status = "connected" | "failed";

function redirectTo(path: string, status: Status) {
  return NextResponse.redirect(`${env.APP_URL}${path}?hh=${status}`);
}
const companyResult = (s: Status) => redirectTo("/hr/settings/company", s);
const platformResult = (s: Status) => redirectTo("/operator/sourcing", s);

/** Exchange the authorization code and probe employer context (best-effort). */
async function exchangeAndProbe(code: string): Promise<{ token: HhPersistedTokenState; me?: HhMe }> {
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
  return { token, me };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = verifyHhOAuthState(params.get("state"));
  if (!code || !state) return companyResult("failed");

  // Platform fallback connection — operator authorizes one shared employer
  // account that every tenant without its own connection searches through.
  if (state.scope === "platform") {
    const auth = await requireOperatorApi({ write: true });
    if (!auth.ok || state.userId !== auth.user.id) return platformResult("failed");
    try {
      const { token, me } = await exchangeAndProbe(code);
      await savePlatformHhConnection({ token });
      logger.info(
        { employerId: me?.employer?.id ?? null, employerName: me?.employer?.name ?? null },
        "[sourcing] hh platform connection saved",
      );
      return platformResult("connected");
    } catch (err) {
      logger.error({ err: String(err) }, "[sourcing] hh platform oauth callback failed");
      return platformResult("failed");
    }
  }

  // Per-company connection — an HR owner/admin connects their own employer account.
  const access = await requireCompanyAccessApi({ roles: ["owner", "admin"] });
  if (!access.ok || state.companyId !== access.companyId || state.userId !== access.user.id) {
    return companyResult("failed");
  }
  try {
    const { token, me } = await exchangeAndProbe(code);
    await saveCompanyHhConnection({ companyId: access.companyId, userId: access.user.id, token, me });

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

    return companyResult("connected");
  } catch (err) {
    logger.error(
      { err: String(err), companyId: access.companyId },
      "[sourcing] hh oauth callback failed",
    );
    return companyResult("failed");
  }
}
