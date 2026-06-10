import { HRShell } from "@/components/hr/hr-shell";
import { QuotaBanner } from "@/components/hr/quota-banner";
import { ToastProvider } from "@/components/ui";
import { getCurrentCompany } from "@/lib/companies/current";
import { requireUser } from "@/lib/auth/guards";
import { getLocale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Runs before React hydrates. Reads the recruiter's stored theme (or system
 * preference) and stamps <html data-hr-theme> so the shell and any Radix
 * portals render dark immediately — no light-mode flash on load.
 */
const THEME_PRIMER = `
try {
  var t = localStorage.getItem('tezhr-hr-theme');
  if (t !== 'dark' && t !== 'light') {
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-hr-theme', t);
} catch (e) {}
`;

async function getSidebarCounts(companyId: string | undefined) {
  if (!companyId) return undefined;
  const admin = createAdminClient();
  const [{ count: jobsCount }, { data: jobIds }] = await Promise.all([
    admin
      .from("job_postings")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    admin.from("job_postings").select("id").eq("company_id", companyId),
  ]);

  const ids = (jobIds ?? []).map((j) => j.id);
  if (ids.length === 0) return { jobs: jobsCount ?? 0, candidates: 0, newCandidates: 0 };

  const [{ count: candidatesCount }, { count: newCount }] = await Promise.all([
    admin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .in("job_posting_id", ids)
      .neq("status", "rejected_screening"),
    admin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .in("job_posting_id", ids)
      .eq("status", "pending_analysis"),
  ]);

  return {
    jobs: jobsCount ?? 0,
    candidates: candidatesCount ?? 0,
    newCandidates: newCount ?? 0,
  };
}

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await getCurrentCompany();
  const locale = await getLocale();
  const counts = await getSidebarCounts(ctx?.company.id);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <ToastProvider>
      <script dangerouslySetInnerHTML={{ __html: THEME_PRIMER }} />
      <HRShell
        email={user.email ?? ""}
        fullName={profile?.full_name ?? null}
        userId={user.id}
        locale={locale}
        currentCompany={
          ctx
            ? {
                id: ctx.company.id,
                name: ctx.company.name,
                logo_url: ctx.company.logo_url,
                role: ctx.role,
              }
            : undefined
        }
        companies={ctx?.companies.map((c) => ({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          role: c.role,
        }))}
        quotaBanner={ctx ? <QuotaBanner companyId={ctx.company.id} locale={locale} /> : null}
        counts={counts}
      >
        {children}
      </HRShell>
    </ToastProvider>
  );
}
