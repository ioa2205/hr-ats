"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { validateSlug } from "@/lib/company-slug";

export type CompanyActionResult = { ok: true } | { ok: false; error: string };

const identitySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  default_locale: z.enum(["ru", "uz", "en"]).optional(),
  logo_url: z.string().trim().max(1024).nullable().optional(),
});

export async function updateCompanyIdentity(input: unknown): Promise<CompanyActionResult> {
  const { user, companyId } = await requireCompanyAccess({ roles: ["owner", "admin"] });
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("companies")
    .select("name, default_locale, logo_url")
    .eq("id", companyId)
    .single();

  const { error } = await admin.from("companies").update(parsed.data).eq("id", companyId);
  if (error) {
    logger.error({ err: error.message }, "[company] identity update failed");
    return { ok: false, error: "save_failed" };
  }

  await admin.from("audit_log").insert({
    company_id: companyId,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.company.update",
    entity_type: "company",
    entity_id: companyId,
    metadata: { before, after: parsed.data },
  });

  revalidatePath("/hr/settings/company");
  return { ok: true };
}

const slugSchema = z.object({ slug: z.string().trim().toLowerCase() });

export async function updateCompanySlug(input: unknown): Promise<CompanyActionResult> {
  const { user, companyId } = await requireCompanyAccess({ roles: ["owner"] });
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const validation = validateSlug(parsed.data.slug);
  if (!validation.ok) return { ok: false, error: validation.reason };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("companies")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", companyId)
    .maybeSingle();
  if (existing) return { ok: false, error: "taken" };

  const { data: before } = await admin
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .single();

  const { error } = await admin
    .from("companies")
    .update({ slug: parsed.data.slug })
    .eq("id", companyId);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "taken" };
    logger.error({ err: error.message }, "[company] slug update failed");
    return { ok: false, error: "save_failed" };
  }

  await admin.from("audit_log").insert({
    company_id: companyId,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.company.slug_update",
    entity_type: "company",
    entity_id: companyId,
    metadata: { before: before?.slug, after: parsed.data.slug },
  });

  revalidatePath("/hr/settings/company");
  return { ok: true };
}

const transferSchema = z.object({ newOwnerId: z.string().uuid() });

export async function transferOwnership(input: unknown): Promise<CompanyActionResult> {
  const { user, companyId } = await requireCompanyAccess({ roles: ["owner"] });
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.newOwnerId === user.id) return { ok: false, error: "self" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", parsed.data.newOwnerId)
    .maybeSingle();
  if (!target) return { ok: false, error: "not_a_member" };

  const { error: promoteErr } = await admin
    .from("company_members")
    .update({ role: "owner" })
    .eq("company_id", companyId)
    .eq("user_id", parsed.data.newOwnerId);
  if (promoteErr) {
    logger.error({ err: promoteErr.message }, "[company] transfer promote failed");
    return { ok: false, error: "save_failed" };
  }

  const { error: demoteErr } = await admin
    .from("company_members")
    .update({ role: "admin" })
    .eq("company_id", companyId)
    .eq("user_id", user.id);
  if (demoteErr) {
    logger.error({ err: demoteErr.message }, "[company] transfer demote failed");
    return { ok: false, error: "save_failed" };
  }

  await admin.from("audit_log").insert({
    company_id: companyId,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.company.transfer_ownership",
    entity_type: "company",
    entity_id: companyId,
    metadata: { old_owner_id: user.id, new_owner_id: parsed.data.newOwnerId },
  });

  revalidatePath("/hr/settings/company");
  revalidatePath("/hr/settings/team");
  return { ok: true };
}

const deleteSchema = z.object({ confirmation: z.string().trim() });

export async function deleteWorkspace(input: unknown): Promise<CompanyActionResult> {
  const { user, companyId } = await requireCompanyAccess({ roles: ["owner"] });
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  if (
    !company ||
    parsed.data.confirmation.trim().toLowerCase() !== company.name.toLowerCase()
  ) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  const { error } = await admin
    .from("companies")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", companyId);
  if (error) {
    logger.error({ err: error.message }, "[company] soft-delete failed");
    return { ok: false, error: "save_failed" };
  }

  // Free every member from this company so they land on onboarding instead
  // of the /suspended dead-end on their next request.
  const { error: detachError } = await admin
    .from("profiles")
    .update({ current_company_id: null })
    .eq("current_company_id", companyId);
  if (detachError) {
    logger.error({ err: detachError.message }, "[company] detach members failed");
  }

  await admin.from("audit_log").insert({
    company_id: companyId,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.company.soft_delete",
    entity_type: "company",
    entity_id: companyId,
    metadata: { company_name: company.name },
  });

  redirect("/onboarding");
}
