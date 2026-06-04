import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import type { SourceConnector } from "../../types";
import {
  HhAuthError,
  HhClient,
  HhRequestError,
  type HhMe,
  type HhPersistedTokenState,
} from "./client";
import { createHhConnector } from "./connector";

type AdminClient = ReturnType<typeof createAdminClient>;
type CompanyConnection = Database["public"]["Tables"]["company_hh_connections"]["Row"];
type PlatformConnection = Database["public"]["Tables"]["platform_hh_connection"]["Row"];

export type HhConnectionScope =
  | { kind: "company"; companyId: string; row: CompanyConnection }
  | { kind: "platform"; row: PlatformConnection | null };

/**
 * Per-run hh.uz query overrides, injected where the company connector is built
 * (an hh-only concern — the funnel and other connectors never see these).
 */
export interface HhConnectorOverrides {
  /** user free-text query; replaces the AI-derived query when non-empty. */
  text?: string;
  /** user area id; `null` ⇒ all areas; absent (`undefined`) ⇒ env HH_AREA_ID. */
  areaId?: string | null;
}

export interface HhConnectionHealth {
  configured: boolean;
  scope: "company" | "platform" | "none";
  status: "ok" | "needs_reconnect" | "not_configured" | "error";
  employerName?: string | null;
  employerId?: string | null;
  error?: {
    status?: number;
    code?: string;
    message: string;
  };
}

const PLATFORM_ACCESS_SECRET = "hh.platform.access_token";
const PLATFORM_REFRESH_SECRET = "hh.platform.refresh_token";

function tokenError(err: unknown): { status?: number; code?: string; message: string } {
  if (err instanceof HhAuthError || err instanceof HhRequestError) {
    return { status: err.status, code: err.code, message: err.message.slice(0, 300) };
  }
  return { message: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300) };
}

async function readSecret(admin: AdminClient, name: string | null | undefined): Promise<string | null> {
  if (!name) return null;
  const { data, error } = await admin.rpc("app_secret_read", { p_name: name });
  if (error) {
    logger.error({ err: error, name }, "[sourcing] hh secret read failed");
    return null;
  }
  return typeof data === "string" && data.length > 0 ? data : null;
}

async function upsertSecret(admin: AdminClient, name: string, value: string): Promise<void> {
  const { error } = await admin.rpc("app_secret_upsert", { p_name: name, p_secret: value });
  if (error) throw new Error(`hh_secret_upsert_failed: ${error.message}`);
}

function companySecretName(companyId: string, token: "access" | "refresh"): string {
  return `hh.company.${companyId}.${token}_token`;
}

async function companyConnection(admin: AdminClient, companyId: string): Promise<CompanyConnection | null> {
  const { data } = await admin
    .from("company_hh_connections")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

async function platformConnection(admin: AdminClient): Promise<PlatformConnection | null> {
  const { data } = await admin
    .from("platform_hh_connection")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return data ?? null;
}

async function resolveScope(admin: AdminClient, companyId: string): Promise<HhConnectionScope | null> {
  const company = await companyConnection(admin, companyId);
  if (company) return { kind: "company", companyId, row: company };

  if (!env.HH_PLATFORM_FALLBACK_ENABLED) return null;
  const platform = await platformConnection(admin);
  if (platform?.status === "disabled" || platform?.status === "needs_reconnect") return null;
  if (!platform?.refresh_secret_name && !env.HH_REFRESH_TOKEN) return null;
  return { kind: "platform", row: platform };
}

function hasBaseConfig(): boolean {
  return Boolean(env.HH_CLIENT_ID && env.HH_CLIENT_SECRET);
}

/** Whether the platform has hh OAuth app credentials (client id + secret) set —
 *  the precondition for the in-app Connect flow to work at all. */
export function isHhConfigured(): boolean {
  return hasBaseConfig();
}

async function persistToken(admin: AdminClient, scope: HhConnectionScope, token: HhPersistedTokenState): Promise<void> {
  const accessName =
    scope.kind === "company" ? companySecretName(scope.companyId, "access") : PLATFORM_ACCESS_SECRET;
  const refreshName =
    scope.kind === "company" ? companySecretName(scope.companyId, "refresh") : PLATFORM_REFRESH_SECRET;

  await upsertSecret(admin, accessName, token.accessToken);
  if (token.refreshToken) await upsertSecret(admin, refreshName, token.refreshToken);

  if (scope.kind === "company") {
    await admin
      .from("company_hh_connections")
      .update({
        access_secret_name: accessName,
        refresh_secret_name: refreshName,
        access_expires_at: token.accessExpiresAt,
        status: "active",
        last_error: null,
        last_error_at: null,
      })
      .eq("company_id", scope.companyId);
    return;
  }

  await admin.from("platform_hh_connection").upsert(
    {
      id: true,
      access_secret_name: accessName,
      refresh_secret_name: refreshName,
      access_expires_at: token.accessExpiresAt,
      status: "active",
      last_error: null,
      last_error_at: null,
    },
    { onConflict: "id" },
  );
}

async function markError(admin: AdminClient, scope: HhConnectionScope, err: unknown): Promise<void> {
  const info = tokenError(err);
  const lastError = [info.code, info.message].filter(Boolean).join(": ").slice(0, 500);
  const patch = {
    status: "needs_reconnect",
    last_error: lastError,
    last_error_at: new Date().toISOString(),
  };
  if (scope.kind === "company") {
    await admin.from("company_hh_connections").update(patch).eq("company_id", scope.companyId);
  } else {
    await admin.from("platform_hh_connection").upsert({ id: true, ...patch }, { onConflict: "id" });
  }
}

export async function hhAvailableForCompany(companyId: string): Promise<boolean> {
  if (!hasBaseConfig()) return false;
  const admin = createAdminClient();
  return (await resolveScope(admin, companyId)) != null;
}

export async function createHhConnectorForCompany(
  companyId: string,
  overrides?: HhConnectorOverrides,
): Promise<SourceConnector | null> {
  if (!hasBaseConfig()) return null;
  const admin = createAdminClient();
  const scope = await resolveScope(admin, companyId);
  if (!scope) return null;

  // areaId precedence: explicit override (incl. `null` ⇒ all areas) wins;
  // absent override falls back to the platform default env HH_AREA_ID.
  const areaId =
    overrides?.areaId !== undefined ? (overrides.areaId ?? undefined) : env.HH_AREA_ID;

  const refreshToken =
    scope.kind === "company"
      ? await readSecret(admin, scope.row.refresh_secret_name)
      : (await readSecret(admin, scope.row?.refresh_secret_name)) ?? env.HH_REFRESH_TOKEN;
  const accessToken =
    scope.kind === "company"
      ? await readSecret(admin, scope.row.access_secret_name)
      : await readSecret(admin, scope.row?.access_secret_name);
  const accessExpiresAt =
    scope.kind === "company" ? scope.row.access_expires_at : scope.row?.access_expires_at;

  if (!refreshToken && !accessToken) return null;

  const client = new HhClient({
    clientId: env.HH_CLIENT_ID!,
    clientSecret: env.HH_CLIENT_SECRET!,
    refreshToken: refreshToken ?? undefined,
    accessToken: accessToken ?? undefined,
    accessExpiresAt,
    apiBaseUrl: env.HH_API_BASE_URL,
    tokenUrl: env.HH_TOKEN_URL,
    userAgent: env.HH_USER_AGENT,
    host: env.HH_HOST,
    areaId,
    onToken: (token) => persistToken(admin, scope, token),
  });

  return createHhConnector({
    search: async (params) => {
      try {
        return await client.searchResumes(params);
      } catch (err) {
        await markError(admin, scope, err);
        throw err;
      }
    },
    isConfigured: () => true,
    textOverride: overrides?.text,
  });
}

export async function saveCompanyHhConnection(input: {
  companyId: string;
  userId: string;
  token: HhPersistedTokenState;
  me?: HhMe;
}): Promise<void> {
  const admin = createAdminClient();
  const accessName = companySecretName(input.companyId, "access");
  const refreshName = companySecretName(input.companyId, "refresh");
  await upsertSecret(admin, accessName, input.token.accessToken);
  if (!input.token.refreshToken) throw new Error("hh_refresh_token_missing");
  await upsertSecret(admin, refreshName, input.token.refreshToken);

  await admin.from("company_hh_connections").upsert(
    {
      company_id: input.companyId,
      employer_id: input.me?.employer?.id ?? null,
      employer_name: input.me?.employer?.name ?? null,
      manager_id: input.me?.manager?.id ?? input.me?.personal_manager?.id ?? input.me?.id ?? null,
      access_secret_name: accessName,
      refresh_secret_name: refreshName,
      access_expires_at: input.token.accessExpiresAt,
      status: "active",
      last_error: null,
      last_error_at: null,
      connected_by: input.userId,
    },
    { onConflict: "company_id" },
  );
}

export async function disconnectCompanyHh(companyId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("company_hh_connections")
    .update({ status: "disabled", last_error: null, last_error_at: null })
    .eq("company_id", companyId);
}

export async function checkHhHealth(companyId?: string): Promise<HhConnectionHealth> {
  if (!hasBaseConfig()) return { configured: false, scope: "none", status: "not_configured" };
  const admin = createAdminClient();
  const scope = companyId ? await resolveScope(admin, companyId) : ({ kind: "platform", row: await platformConnection(admin) } as HhConnectionScope);
  if (!scope) return { configured: false, scope: "none", status: "not_configured" };

  const refreshToken =
    scope.kind === "company"
      ? await readSecret(admin, scope.row.refresh_secret_name)
      : (await readSecret(admin, scope.row?.refresh_secret_name)) ?? env.HH_REFRESH_TOKEN;
  const accessToken =
    scope.kind === "company"
      ? await readSecret(admin, scope.row.access_secret_name)
      : await readSecret(admin, scope.row?.access_secret_name);
  const accessExpiresAt =
    scope.kind === "company" ? scope.row.access_expires_at : scope.row?.access_expires_at;

  if (!refreshToken && !accessToken) {
    return { configured: false, scope: scope.kind, status: "not_configured" };
  }

  const client = new HhClient({
    clientId: env.HH_CLIENT_ID!,
    clientSecret: env.HH_CLIENT_SECRET!,
    refreshToken: refreshToken ?? undefined,
    accessToken: accessToken ?? undefined,
    accessExpiresAt,
    apiBaseUrl: env.HH_API_BASE_URL,
    tokenUrl: env.HH_TOKEN_URL,
    userAgent: env.HH_USER_AGENT,
    host: env.HH_HOST,
    areaId: env.HH_AREA_ID,
    onToken: (token) => persistToken(admin, scope, token),
  });

  try {
    const me = await client.getMe();
    return {
      configured: true,
      scope: scope.kind,
      status: "ok",
      employerId: me.employer?.id ?? null,
      employerName: me.employer?.name ?? null,
    };
  } catch (err) {
    await markError(admin, scope, err);
    return { configured: true, scope: scope.kind, status: "error", error: tokenError(err) };
  }
}
