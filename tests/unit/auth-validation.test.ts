import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
} from "@/lib/validations/auth";

describe("signInSchema", () => {
  it("accepts valid email + password", () => {
    const r = signInSchema.safeParse({
      email: "user@example.com",
      password: "anything",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = signInSchema.safeParse({
      email: "not-an-email",
      password: "anything",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty password", () => {
    const r = signInSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    email: "new@example.com",
    password: "password123",
    full_name: "Alisher Navoiy",
  };

  it("accepts valid signup", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("trims full_name", () => {
    const r = signUpSchema.safeParse({ ...valid, full_name: "  Alisher  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.full_name).toBe("Alisher");
  });

  it("rejects short password (< 8)", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects password longer than 72 chars (bcrypt limit)", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "a".repeat(73) });
    expect(r.success).toBe(false);
  });

  it("rejects full_name shorter than 2 chars", () => {
    const r = signUpSchema.safeParse({ ...valid, full_name: "A" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = signUpSchema.safeParse({ ...valid, email: "nope" });
    expect(r.success).toBe(false);
  });
});

describe("requestPasswordResetSchema", () => {
  it("accepts valid email", () => {
    const r = requestPasswordResetSchema.safeParse({ email: "a@b.co" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = requestPasswordResetSchema.safeParse({ email: "nope" });
    expect(r.success).toBe(false);
  });
});

describe("completePasswordResetSchema", () => {
  it("accepts valid password", () => {
    const r = completePasswordResetSchema.safeParse({ password: "password123" });
    expect(r.success).toBe(true);
  });

  it("rejects short password", () => {
    const r = completePasswordResetSchema.safeParse({ password: "short" });
    expect(r.success).toBe(false);
  });
});
