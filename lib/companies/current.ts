import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, CompanyRole } from "@/types";

export interface CompanyContext {
  companyId: string;
  company: Company;
  role: CompanyRole;
  /** All companies the user belongs to (for the switcher) */
  companies: Array<{ id: string; name: string; logo_url: string | null; role: CompanyRole }>;
}

/**
 * Get the current company context for the authenticated user.
 * Returns null if user is not authenticated or has no current company.
 * Use in Server Components and Server Actions.
 */
export async function getCurrentCompany(): Promise<CompanyContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("current_company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.current_company_id) return null;

  const [companyResult, memberResult, allMembershipsResult] = await Promise.all([
    admin.from("companies").select("*").eq("id", profile.current_company_id).single(),
    admin
      .from("company_members")
      .select("role")
      .eq("company_id", profile.current_company_id)
      .eq("user_id", user.id)
      .single(),
    admin
      .from("company_members")
      .select("company_id, role, companies(id, name, logo_url)")
      .eq("user_id", user.id),
  ]);

  if (!companyResult.data || !memberResult.data) return null;

  const companies = (allMembershipsResult.data ?? []).map((m) => {
    const c = m.companies as unknown as { id: string; name: string; logo_url: string | null };
    return {
      id: c.id,
      name: c.name,
      logo_url: c.logo_url,
      role: m.role,
    };
  });

  return {
    companyId: profile.current_company_id,
    company: companyResult.data,
    role: memberResult.data.role,
    companies,
  };
}
