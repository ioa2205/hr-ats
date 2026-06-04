import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";

/** Whom the OAuth flow connects: one company, or the platform-wide fallback. */
export type HhOAuthScope = "company" | "platform";

interface HhOAuthState {
  scope: HhOAuthScope;
  /** set for company scope; null for platform. */
  companyId: string | null;
  userId: string;
  exp: number;
  nonce: string;
}

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "hh-state";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(payload: HhOAuthState): string {
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

/** Company-scoped state (an HR owner/admin connects their own employer account). */
export function createHhOAuthState(companyId: string, userId: string): string {
  return encode({
    scope: "company",
    companyId,
    userId,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  });
}

/** Platform-scoped state (an operator connects the shared fallback account). */
export function createHhPlatformOAuthState(userId: string): string {
  return encode({
    scope: "platform",
    companyId: null,
    userId,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  });
}

export function verifyHhOAuthState(raw: string | null): HhOAuthState | null {
  if (!raw) return null;
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig) return null;
  const expected = sign(encoded);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<HhOAuthState>;
    if (!parsed.userId || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    // Pre-scope states (no `scope` field) are company connections.
    const scope: HhOAuthScope = parsed.scope === "platform" ? "platform" : "company";
    if (scope === "company" && !parsed.companyId) return null;
    return {
      scope,
      companyId: parsed.companyId ?? null,
      userId: parsed.userId,
      exp: parsed.exp,
      nonce: parsed.nonce ?? "",
    };
  } catch {
    return null;
  }
}
