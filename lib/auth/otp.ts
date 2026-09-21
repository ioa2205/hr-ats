import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFICATION_TICKET_TTL_MS = 10 * 60 * 1000;

export function generateOtp(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return String(randomInt(min, max + 1));
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

type VerificationTicketPayload = {
  phone: string;
  expiresAt: number;
  nonce: string;
};

function ticketSignature(payload: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for OTP verification");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Short-lived, signed proof that the caller completed the OTP challenge. */
export function createPhoneVerificationTicket(phone: string): string {
  const payload: VerificationTicketPayload = {
    phone,
    expiresAt: Date.now() + VERIFICATION_TICKET_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${ticketSignature(encoded)}`;
}

export function verifyPhoneVerificationTicket(ticket: string, phone: string): boolean {
  const [encoded, providedSignature, ...extra] = ticket.split(".");
  if (!encoded || !providedSignature || extra.length > 0) return false;

  const expectedSignature = ticketSignature(encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as VerificationTicketPayload;
    return payload.phone === phone && payload.expiresAt > Date.now() && Boolean(payload.nonce);
  } catch {
    return false;
  }
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { logger } = await import("@/lib/logger");
  const supabase = createAdminClient();

  // Expire any unconsumed codes for this phone
  await supabase
    .from("phone_otp_attempts")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .is("consumed_at", null);

  const { error } = await supabase.from("phone_otp_attempts").insert({
    phone,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
  });

  if (error) {
    logger.error({ err: error, phone }, "[otp] store failed");
    throw new Error("otp_store_failed");
  }
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: "expired" | "invalid_code" | "too_many_attempts" | "not_found";
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { logger } = await import("@/lib/logger");
  const supabase = createAdminClient();

  // Get the latest unconsumed OTP for this phone
  const { data: otp, error } = await supabase
    .from("phone_otp_attempts")
    .select("*")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !otp) {
    logger.warn({ phone }, "[otp] no active OTP found");
    return { valid: false, error: "not_found" };
  }

  // Check expiry
  if (new Date(otp.expires_at) < new Date()) {
    await supabase
      .from("phone_otp_attempts")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);
    return { valid: false, error: "expired" };
  }

  // Check attempt count
  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    await supabase
      .from("phone_otp_attempts")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);
    return { valid: false, error: "too_many_attempts" };
  }

  // Increment attempts
  await supabase
    .from("phone_otp_attempts")
    .update({ attempts: otp.attempts + 1 })
    .eq("id", otp.id);

  // Verify hash
  if (hashOtp(code) !== otp.code_hash) {
    return { valid: false, error: "invalid_code" };
  }

  // Mark consumed on success
  await supabase
    .from("phone_otp_attempts")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);

  return { valid: true };
}
