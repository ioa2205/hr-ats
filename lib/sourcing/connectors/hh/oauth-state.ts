import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";

interface HhOAuthState {
  companyId: string;
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

export function createHhOAuthState(companyId: string, userId: string): string {
  const payload: HhOAuthState = {
    companyId,
    userId,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID(),
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
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
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as HhOAuthState;
    if (!parsed.companyId || !parsed.userId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
