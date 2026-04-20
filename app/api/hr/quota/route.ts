import { NextResponse } from "next/server";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { getQuotaState } from "@/lib/companies/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const quota = await getQuotaState(access.companyId);
  if (!quota) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  return NextResponse.json({
    status: quota.status,
    trial_ends_at: quota.trialEndsAt,
    days_remaining: quota.daysRemaining,
    cv_quota_used: quota.cvQuotaUsed,
    cv_quota_limit: quota.cvQuotaLimit,
    job_quota_limit: quota.jobQuotaLimit,
    active_job_count: quota.activeJobCount,
    can_write: quota.canWrite,
  });
}
