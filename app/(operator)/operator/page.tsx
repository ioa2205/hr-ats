import { headers } from "next/headers";
import { DashboardView, type DashboardData } from "@/components/operator/dashboard/dashboard-view";
import { env } from "@/lib/env";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchInitial(): Promise<DashboardData | null> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = host ? `${proto}://${host}` : env.APP_URL;

  try {
    const res = await fetch(`${base}/api/operator/dashboard?range=30`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DashboardData;
  } catch {
    return null;
  }
}

export default async function OperatorDashboard() {
  const initial = await fetchInitial();
  if (!initial) {
    const locale = await getLocale();
    return (
      <div className="font-[var(--font-tez-sans)] rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-6 text-[13px] text-[var(--color-ink-3)]">
        {t("operator.dashboard.error", locale)}
      </div>
    );
  }
  return <DashboardView initial={initial} />;
}
