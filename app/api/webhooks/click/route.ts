import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClickSignature } from "@/lib/billing/click";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Click webhook handler. Two phases per spec:
 *   action=0  Prepare    — return merchant_prepare_id
 *   action=1  Complete   — on error=0 mark invoice paid + flip subscription
 *
 * Idempotency: keyed on click_trans_id. Replays of the same Complete event
 * return the same merchant_confirm_id without double-crediting.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload = {
    click_trans_id: String(formData.get("click_trans_id") ?? ""),
    service_id: String(formData.get("service_id") ?? ""),
    merchant_trans_id: String(formData.get("merchant_trans_id") ?? ""),
    merchant_prepare_id: formData.get("merchant_prepare_id")
      ? String(formData.get("merchant_prepare_id"))
      : undefined,
    amount: String(formData.get("amount") ?? ""),
    action: String(formData.get("action") ?? ""),
    error: Number(formData.get("error") ?? "0"),
    sign_time: String(formData.get("sign_time") ?? ""),
    sign_string: String(formData.get("sign_string") ?? ""),
  };

  if (!payload.click_trans_id || !payload.merchant_trans_id || !payload.action) {
    return NextResponse.json({ error: -8, error_note: "missing_fields" });
  }

  if (!verifyClickSignature(payload)) {
    logger.warn(
      { context: "click-webhook", click_trans_id: payload.click_trans_id },
      "Bad Click signature",
    );
    return NextResponse.json({ error: -1, error_note: "SIGN CHECK FAILED!" });
  }

  const admin = createAdminClient();

  // Lookup invoice by merchant_trans_id (which we set to invoice id).
  const { data: invoice } = await admin
    .from("subscription_invoices")
    .select("id, company_id, plan_id, amount_uzs, status, click_transaction_id, click_merchant_prepare_id")
    .eq("id", payload.merchant_trans_id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: -5, error_note: "Order not found" });
  }

  if (Math.abs(Number(invoice.amount_uzs) - Number(payload.amount)) > 0.01) {
    return NextResponse.json({ error: -2, error_note: "Incorrect amount" });
  }

  // ── Phase 0: Prepare ─────────────────────────────────────────────
  if (payload.action === "0") {
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: -4, error_note: "Already paid" });
    }
    const merchantPrepareId = invoice.id; // reuse invoice id as prepare id
    await admin
      .from("subscription_invoices")
      .update({
        click_transaction_id: payload.click_trans_id,
        click_merchant_prepare_id: merchantPrepareId,
      })
      .eq("id", invoice.id);

    return NextResponse.json({
      error: 0,
      error_note: "Success",
      click_trans_id: payload.click_trans_id,
      merchant_trans_id: invoice.id,
      merchant_prepare_id: merchantPrepareId,
    });
  }

  // ── Phase 1: Complete ────────────────────────────────────────────
  if (payload.action === "1") {
    // Idempotent replay: if already paid, return the same confirm id.
    if (invoice.status === "paid") {
      return NextResponse.json({
        error: 0,
        error_note: "Success",
        click_trans_id: payload.click_trans_id,
        merchant_trans_id: invoice.id,
        merchant_confirm_id: invoice.id,
      });
    }

    if (payload.error !== 0) {
      await admin
        .from("subscription_invoices")
        .update({ status: "failed", failure_reason: `click_error_${payload.error}` })
        .eq("id", invoice.id);
      return NextResponse.json({ error: payload.error, error_note: "Payment failed" });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await admin
      .from("subscription_invoices")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .eq("id", invoice.id);

    await admin
      .from("subscriptions")
      .update({
        status: "active",
        plan_id: invoice.plan_id,
        current_period_end: periodEnd.toISOString(),
        grace_period_ends_at: null,
        pro_started_at: now.toISOString(),
        pro_renews_at: periodEnd.toISOString(),
      })
      .eq("company_id", invoice.company_id);

    logger.info(
      { context: "click-webhook", invoice: invoice.id, company: invoice.company_id },
      "Subscription activated via Click",
    );

    return NextResponse.json({
      error: 0,
      error_note: "Success",
      click_trans_id: payload.click_trans_id,
      merchant_trans_id: invoice.id,
      merchant_confirm_id: invoice.id,
    });
  }

  return NextResponse.json({ error: -3, error_note: "Unknown action" });
}
