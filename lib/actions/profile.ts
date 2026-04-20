"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Locale } from "@/lib/i18n/types";

const profilePatchSchema = z.object({
  full_name: z.string().trim().min(2).max(200).optional(),
  locale: z.enum(["ru", "uz", "en"]).optional(),
  avatar_url: z.string().trim().max(1024).nullable().optional(),
});

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

export async function patchProfile(input: unknown): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = profilePatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("profiles")
    .select("full_name, locale, avatar_url")
    .eq("id", user.id)
    .single();

  const { error } = await admin.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    logger.error({ err: error.message }, "[profile] patch failed");
    return { ok: false, error: "save_failed" };
  }

  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.update",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { before, after: parsed.data },
  });

  revalidatePath("/hr/settings/profile");
  return { ok: true };
}

const emailSchema = z.object({ email: z.string().trim().email() });

export async function changeEmail(input: unknown): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_email" };
  if (parsed.data.email.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return { ok: false, error: "unchanged" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    logger.error({ err: error.message }, "[profile] email change failed");
    return { ok: false, error: error.message };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.email_change_requested",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { requested_email: parsed.data.email },
  });

  return { ok: true };
}

const passwordSchema = z
  .object({
    new: z.string(),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.new.length < 10) ctx.addIssue({ code: "custom", message: "short" });
    if (!/[A-Za-z]/.test(v.new)) ctx.addIssue({ code: "custom", message: "letter" });
    if (!/[0-9]/.test(v.new)) ctx.addIssue({ code: "custom", message: "digit" });
    if (v.new !== v.confirm) ctx.addIssue({ code: "custom", message: "mismatch" });
  });

export async function changePassword(input: unknown): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "invalid";
    return { ok: false, error: first };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.new });
  if (error) {
    logger.error({ err: error.message }, "[profile] password change failed");
    return { ok: false, error: "generic" };
  }

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.password_changed",
    entity_type: "profile",
    entity_id: user.id,
    metadata: {},
  });

  return { ok: true };
}

export async function signOutEverywhere(): Promise<ProfileActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    logger.error({ err: error.message }, "[profile] sign out global failed");
    return { ok: false, error: "generic" };
  }
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.sign_out_everywhere",
    entity_type: "profile",
    entity_id: user.id,
    metadata: {},
  });
  redirect("/auth/login");
}

export async function deleteMyAccount(input: unknown): Promise<ProfileActionResult> {
  const parsed = z
    .object({ confirmation: z.string().trim() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const user = await requireUser();
  if (parsed.data.confirmation.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  const admin = createAdminClient();
  const { data: ownerRows } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  for (const row of ownerRows ?? []) {
    const { count } = await admin
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", row.company_id)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "sole_owner" };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logger.error({ err: error.message }, "[profile] delete user failed");
    return { ok: false, error: "generic" };
  }

  await admin.from("audit_log").insert({
    company_id: null,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.profile.account_deleted",
    entity_type: "profile",
    entity_id: user.id,
    metadata: {},
  });

  redirect("/auth/login");
}

export async function setLocaleAction(locale: Locale): Promise<ProfileActionResult> {
  return patchProfile({ locale });
}
