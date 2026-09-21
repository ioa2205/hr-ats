import { describe, it, expect } from "vitest";
import {
  createPhoneVerificationTicket,
  generateOtp,
  hashOtp,
  verifyPhoneVerificationTicket,
} from "@/lib/auth/otp";
import {
  phoneOtpStartSchema,
  phoneOtpVerifySchema,
  phoneSignupCompleteSchema,
} from "@/lib/validations/auth";

describe("generateOtp", () => {
  it("returns a 6-digit numeric string", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
    // With 6 digits, 20 random codes should have at least 2 unique values
    expect(codes.size).toBeGreaterThan(1);
  });

  it("never generates a code starting with 0", () => {
    // 6-digit codes start at 100000
    for (let i = 0; i < 50; i++) {
      const code = generateOtp();
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });
});

describe("hashOtp", () => {
  it("returns a hex string", () => {
    const hash = hashOtp("123456");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });

  it("different codes produce different hashes", () => {
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
  });
});

describe("phone verification tickets", () => {
  it("binds a short-lived signed ticket to the verified phone", () => {
    const ticket = createPhoneVerificationTicket("+998901234567");
    expect(verifyPhoneVerificationTicket(ticket, "+998901234567")).toBe(true);
    expect(verifyPhoneVerificationTicket(ticket, "+998901234568")).toBe(false);
  });

  it("rejects tampered tickets", () => {
    const ticket = createPhoneVerificationTicket("+998901234567");
    expect(verifyPhoneVerificationTicket(`${ticket}x`, "+998901234567")).toBe(false);
  });
});

describe("phoneOtpStartSchema", () => {
  it("accepts valid Uzbek phone number", () => {
    const r = phoneOtpStartSchema.safeParse({ phone: "+998901234567" });
    expect(r.success).toBe(true);
  });

  it("rejects phone without +998 prefix", () => {
    const r = phoneOtpStartSchema.safeParse({ phone: "+1234567890" });
    expect(r.success).toBe(false);
  });

  it("rejects phone with wrong digit count", () => {
    const r = phoneOtpStartSchema.safeParse({ phone: "+99890123456" }); // 8 digits after 998
    expect(r.success).toBe(false);
  });

  it("rejects phone with letters", () => {
    const r = phoneOtpStartSchema.safeParse({ phone: "+998abcdefghi" });
    expect(r.success).toBe(false);
  });

  it("rejects empty phone", () => {
    const r = phoneOtpStartSchema.safeParse({ phone: "" });
    expect(r.success).toBe(false);
  });
});

describe("phoneOtpVerifySchema", () => {
  it("accepts valid phone + 6-digit code", () => {
    const r = phoneOtpVerifySchema.safeParse({
      phone: "+998901234567",
      code: "123456",
    });
    expect(r.success).toBe(true);
  });

  it("rejects code with non-digits", () => {
    const r = phoneOtpVerifySchema.safeParse({
      phone: "+998901234567",
      code: "12345a",
    });
    expect(r.success).toBe(false);
  });

  it("rejects code with wrong length", () => {
    const r = phoneOtpVerifySchema.safeParse({
      phone: "+998901234567",
      code: "12345",
    });
    expect(r.success).toBe(false);
  });
});

describe("phoneSignupCompleteSchema", () => {
  const valid = {
    phone: "+998901234567",
    email: "user@example.com",
    full_name: "Alisher Navoiy",
    verification_ticket: "a".repeat(32),
  };

  it("accepts valid complete signup", () => {
    const r = phoneSignupCompleteSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("trims full_name", () => {
    const r = phoneSignupCompleteSchema.safeParse({
      ...valid,
      full_name: "  Alisher  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.full_name).toBe("Alisher");
  });

  it("rejects short full_name", () => {
    const r = phoneSignupCompleteSchema.safeParse({
      ...valid,
      full_name: "A",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = phoneSignupCompleteSchema.safeParse({
      ...valid,
      email: "not-email",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid phone", () => {
    const r = phoneSignupCompleteSchema.safeParse({
      ...valid,
      phone: "12345",
    });
    expect(r.success).toBe(false);
  });
});
