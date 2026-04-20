export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { canWrite as canWriteQuota } from "@/lib/companies/quota";
import { getLocale } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { JobsListClient } from "./jobs-list-client";

interface JobWithCounts {
  id: string;
  company_id: string;
  title: string;
  title_ru: string | null;
  title_uz: string | null;
  title_en: string | null;
  status: "active" | "closed";
  public_token: string;
  created_at: string;
  total_count: number;
  qualified_count: number;
  screened_out_count: number;
  failed_count: number;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;
  const initialFilter =
    statusParam === "closed" || statusParam === "active" ? statusParam : "all";

  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const supabaseAdmin = createAdminClient();

  const [jobsResult, writable] = await Promise.all([
    supabaseAdmin
      .from("job_postings_with_counts" as "job_postings")
      .select(
        "id,company_id,title,title_ru,title_uz,title_en,status,public_token,created_at,total_count,qualified_count,screened_out_count,failed_count",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    canWriteQuota(companyId),
  ]);

  const postings = (jobsResult.data ?? []) as unknown as JobWithCounts[];

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <JobsListClient
      jobs={postings.map((j) => ({
        id: j.id,
        title: pickLocalized(
          { ru: j.title_ru, uz: j.title_uz, en: j.title_en },
          locale,
          j.title,
        ),
        status: j.status,
        public_token: j.public_token,
        created_at: j.created_at,
        total_count: j.total_count,
        qualified_count: j.qualified_count,
        screened_out_count: j.screened_out_count,
        failed_count: j.failed_count,
      }))}
      appUrl={appUrl}
      canWrite={writable}
      initialStatusFilter={initialFilter}
    />
  );
}
