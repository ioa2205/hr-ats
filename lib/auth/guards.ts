import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canWrite } from "@/lib/companies/quota";
import type { CompanyRole } from "@/types";

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export interface CompanyAccess {
  user: User;
  companyId: string;
  role: CompanyRole;
}

export type CompanyGuardOptions = {
  roles?: CompanyRole[];
  /**
   * When true, also verifies the company's subscription is in a writable state
   * (Pro active, or trialing within trial_ends_at). Used by mutation routes —
   * expired/cancelled trials get a 403 with `error: 'subscription_inactive'`.
   */
  requireWrite?: boolean;
};

export class CompanyAccessError extends Error {
  constructor(public code: "unauthorized" | "no_company" | "not_a_member" | "insufficient_role") {
    super(code);
    this.name = "CompanyAccessError";
  }
}

/**
 * For server components: resolves the current user's company membership.
 * Redirects to /auth/login or /onboarding when the caller has no access.
 */
export async function requireCompanyAccess(opts?: CompanyGuardOptions): Promise<CompanyAccess> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("current_company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_company_id) {
    redirect("/onboarding");
  }

  const { data: member } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", profile.current_company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    redirect("/onboarding");
  }

  if (opts?.roles && !opts.roles.includes(member.role)) {
    throw new CompanyAccessError("insufficient_role");
  }

  return {
    user,
    companyId: profile.current_company_id,
    role: member.role,
  };
}

/**
 * For API routes: returns a structured result instead of redirecting.
 * Callers should return NextResponse.json(... , { status }) when !ok.
 */
export type CompanyAccessResult =
  | { ok: true; user: User; companyId: string; role: CompanyRole }
  | { ok: false; status: number; error: string };

/**
 * For server components: ensures the caller is an operator (super-admin).
 * Redirects non-operators to /hr/dashboard.
 */
export async function requireOperator(): Promise<User> {
  const user = await requireUser();
  const isOp = user.app_metadata?.is_operator === true;
  if (!isOp) {
    redirect("/hr/dashboard");
  }
  return user;
}

/**
 * For API routes: ensures the caller is an operator.
 * Returns a structured result instead of redirecting.
 *
 * Pass `{ write: true }` on any mutation route — read-only operators get 403
 * at the API layer even though they pass the /operator/* gate.
 */
export type OperatorResult =
  | { ok: true; user: User; role: "full" | "read_only" }
  | { ok: false; status: number; error: string };

export async function requireOperatorApi(opts?: {
  write?: boolean;
}): Promise<OperatorResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  if (user.app_metadata?.is_operator !== true) {
    return { ok: false, status: 403, error: "not_operator" };
  }

  const role: "full" | "read_only" =
    user.app_metadata?.operator_role === "read_only" ? "read_only" : "full";

  if (opts?.write && role === "read_only") {
    return { ok: false, status: 403, error: "read_only_operator" };
  }

  return { ok: true, user, role };
}

export async function requireCompanyAccessApi(
  opts?: CompanyGuardOptions,
): Promise<CompanyAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("current_company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_company_id) {
    return { ok: false, status: 403, error: "no_company" };
  }

  const { data: member } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", profile.current_company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return { ok: false, status: 403, error: "not_a_member" };
  }

  if (opts?.roles && !opts.roles.includes(member.role)) {
    return { ok: false, status: 403, error: "insufficient_role" };
  }

  if (opts?.requireWrite && !(await canWrite(profile.current_company_id))) {
    return { ok: false, status: 403, error: "subscription_inactive" };
  }

  return { ok: true, user, companyId: profile.current_company_id, role: member.role };
}
