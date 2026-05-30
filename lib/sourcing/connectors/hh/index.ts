/**
 * Env wiring for the hh.uz connector. Keeps `env`/IO out of the pure modules:
 * the connector + client + normalizer are all testable without this file.
 *
 * `createHhConnectorFromEnv` returns null when credentials are absent, so the
 * worker simply omits hh and sources the internal pool only — no config, no
 * crash. Paste HH_CLIENT_ID + HH_CLIENT_SECRET and it activates.
 */
import { env } from "@/lib/env";
import type { SourceConnector } from "../../types";
import { HhClient } from "./client";
import { createHhConnector } from "./connector";

/** Are hh credentials present? Used by the trigger to record active sources. */
export function hhConfiguredFromEnv(): boolean {
  return Boolean(env.HH_CLIENT_ID && env.HH_CLIENT_SECRET);
}

/** Build the live hh connector, or null when unconfigured. */
export function createHhConnectorFromEnv(): SourceConnector | null {
  if (!env.HH_CLIENT_ID || !env.HH_CLIENT_SECRET) return null;
  const client = new HhClient({
    clientId: env.HH_CLIENT_ID,
    clientSecret: env.HH_CLIENT_SECRET,
    refreshToken: env.HH_REFRESH_TOKEN,
    apiBaseUrl: env.HH_API_BASE_URL,
    tokenUrl: env.HH_TOKEN_URL,
    userAgent: env.HH_USER_AGENT,
    areaId: env.HH_AREA_ID,
  });
  return createHhConnector({
    search: (params) => client.searchResumes(params),
    isConfigured: hhConfiguredFromEnv,
  });
}
