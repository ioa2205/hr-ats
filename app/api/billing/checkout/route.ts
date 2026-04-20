import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { buildCheckoutUrl, clickIsPlaceholder } from "@/lib/billing/click";

export const runtime = "nodejs";

const bodySchema = z.object({
  plan_code: z.string().min(1),
});

/**
 * Initiate Click checkout for the authenticated company. Creates a pending
 * subscription_invoices row, then returns the Click hosted-page URL for the
 * client to redirect to.
 */
export async function POST(req: NextRequest) {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  if (clickIsPlaceholder()) {
    return NextResponse.json({ error: "click_not_configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, price_uzs, active")
    .eq("code", parsed.data.plan_code)
    .maybeSingle();

  if (!plan || !plan.active) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const { data: invoice, error: invErr } = await admin
    .from("subscription_invoices")
    .insert({
      company_id: access.companyId,
      plan_id: plan.id,
      amount_uzs: plan.price_uzs,
      status: "pending",
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    logger.error({ err: invErr, companyId: access.companyId }, "[billing] invoice create failed");
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  const checkoutUrl = buildCheckoutUrl({
    amountUzs: Number(plan.price_uzs),
    invoiceId: invoice.id,
    returnUrl: `${env.APP_URL}/hr/settings/billing?invoice=${invoice.id}`,
  });

  return NextResponse.json({ ok: true, url: checkoutUrl, invoice_id: invoice.id });
}
