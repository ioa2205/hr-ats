import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCompanySchema } from "@/lib/validations/onboarding";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { name, default_locale } = parsed.data;
  const baseSlug = slugify(name);

  // Use admin client for cross-table writes (company + member + subscription + profile update)
  const admin = createAdminClient();

  // Insert the company, retrying with a random suffix on slug collision.
  // Why try-and-retry rather than check-then-insert: the previous pattern
  // had a TOCTOU window where two concurrent requests could both see the
  // slug as free and then race into inserts, and the unique-index violation
  // on `companies.slug` surfaced as a generic create_failed. The DB's unique
  // constraint is the atomic source of truth; catch 23505 and retry.
  const baseSlugFinal = baseSlug || "company";
  let slug = baseSlugFinal;
  let company: { id: string } | null = null;
  let lastError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("companies")
      .insert({ name, slug, default_locale })
      .select("id")
      .single();
    if (!error && data) {
      company = data;
      break;
    }
    lastError = error;
    if (error?.code !== "23505") break;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlugFinal}-${suffix}`;
  }

  if (!company) {
    logger.error({ err: lastError?.message }, "[onboarding] company insert failed");
    const status = lastError?.code === "23505" ? 409 : 500;
    const error = lastError?.code === "23505" ? "slug_taken" : "create_failed";
    return NextResponse.json({ error }, { status });
  }

  // Add user as Owner
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    logger.error({ err: memberError.message }, "[onboarding] member insert failed");
    // Rollback: delete the company we just created
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  // Create subscription with 14-day trial
  const { error: subError } = await admin.from("subscriptions").insert({
    company_id: company.id,
  });

  if (subError) {
    logger.error({ err: subError.message }, "[onboarding] subscription insert failed");
    // Rollback
    await admin.from("company_members").delete().eq("company_id", company.id);
    await admin.from("companies").delete().eq("id", company.id);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  // Set current_company_id on profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({ current_company_id: company.id })
    .eq("id", user.id);

  if (profileError) {
    logger.error({ err: profileError.message }, "[onboarding] profile update failed");
    // Non-fatal — company was created. User can still be redirected.
  }

  // Audit log
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    company_id: company.id,
    action: "company.created",
    entity_type: "company",
    entity_id: company.id,
    metadata: { name, slug },
  });

  logger.info({ company_id: company.id, user_id: user.id, slug }, "[onboarding] company created");

  return NextResponse.json({ company_id: company.id }, { status: 201 });
}
