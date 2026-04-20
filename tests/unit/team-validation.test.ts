import { describe, it, expect } from "vitest";
import {
  sendInviteSchema,
  changeRoleSchema,
  removeMemberSchema,
  saveTemplatesSchema,
} from "@/lib/validations/team";

describe("sendInviteSchema", () => {
  it("accepts valid email + role", () => {
    const r = sendInviteSchema.safeParse({
      email: "colleague@example.com",
      role: "recruiter",
    });
    expect(r.success).toBe(true);
  });

  it("accepts admin role", () => {
    const r = sendInviteSchema.safeParse({
      email: "colleague@example.com",
      role: "admin",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = sendInviteSchema.safeParse({
      email: "not-an-email",
      role: "recruiter",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty email", () => {
    const r = sendInviteSchema.safeParse({
      email: "",
      role: "recruiter",
    });
    expect(r.success).toBe(false);
  });

  it("rejects owner role (only admin/recruiter allowed)", () => {
    const r = sendInviteSchema.safeParse({
      email: "colleague@example.com",
      role: "owner",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const r = sendInviteSchema.safeParse({
      email: "colleague@example.com",
      role: "superadmin",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing role", () => {
    const r = sendInviteSchema.safeParse({
      email: "colleague@example.com",
    });
    expect(r.success).toBe(false);
  });

  it("rejects email longer than 320 chars", () => {
    const longEmail = "a".repeat(310) + "@example.com";
    const r = sendInviteSchema.safeParse({
      email: longEmail,
      role: "recruiter",
    });
    expect(r.success).toBe(false);
  });
});

describe("changeRoleSchema", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("accepts valid user_id + role", () => {
    const r = changeRoleSchema.safeParse({
      user_id: validUuid,
      role: "admin",
    });
    expect(r.success).toBe(true);
  });

  it("accepts recruiter role", () => {
    const r = changeRoleSchema.safeParse({
      user_id: validUuid,
      role: "recruiter",
    });
    expect(r.success).toBe(true);
  });

  it("rejects owner role", () => {
    const r = changeRoleSchema.safeParse({
      user_id: validUuid,
      role: "owner",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid UUID", () => {
    const r = changeRoleSchema.safeParse({
      user_id: "not-a-uuid",
      role: "admin",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing user_id", () => {
    const r = changeRoleSchema.safeParse({
      role: "admin",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing role", () => {
    const r = changeRoleSchema.safeParse({
      user_id: validUuid,
    });
    expect(r.success).toBe(false);
  });
});

describe("removeMemberSchema", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("accepts valid UUID", () => {
    const r = removeMemberSchema.safeParse({ user_id: validUuid });
    expect(r.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const r = removeMemberSchema.safeParse({ user_id: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("rejects empty string", () => {
    const r = removeMemberSchema.safeParse({ user_id: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing user_id", () => {
    const r = removeMemberSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("saveTemplatesSchema", () => {
  it("accepts valid templates", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_ru: "Привет, {candidate_name}!",
      telegram_invite_uz: "Salom, {candidate_name}!",
      telegram_invite_en: "Hello, {candidate_name}!",
    });
    expect(r.success).toBe(true);
  });

  it("accepts empty strings", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_ru: "",
      telegram_invite_uz: "",
      telegram_invite_en: "",
    });
    expect(r.success).toBe(true);
  });

  it("rejects template longer than 2000 chars", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_ru: "a".repeat(2001),
      telegram_invite_uz: "ok",
      telegram_invite_en: "ok",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing telegram_invite_ru", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_uz: "ok",
      telegram_invite_en: "ok",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing telegram_invite_uz", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_ru: "ok",
      telegram_invite_en: "ok",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing telegram_invite_en", () => {
    const r = saveTemplatesSchema.safeParse({
      telegram_invite_ru: "ok",
      telegram_invite_uz: "ok",
    });
    expect(r.success).toBe(false);
  });
});
