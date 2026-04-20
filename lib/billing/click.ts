import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Click integration helpers.
 *
 * Click hosted-page checkout flow:
 *   1. App generates a `subscription_invoices` row in 'pending'
 *   2. Builds a hosted-page URL with merchant + service + amount params
 *   3. User completes payment on Click's domain
 *   4. Click POSTs to /api/webhooks/click in two phases:
 *       - action=0 (Prepare): we lock in the merchant_prepare_id
 *       - action=1 (Complete): on error=0, mark invoice paid + flip subscription
 *
 * Signatures:
 *   Click uses an MD5 hash of merchant params as the digest. For prepare:
 *     md5(click_trans_id + service_id + secret_key + merchant_trans_id +
 *         amount + action + sign_time)
 *   For complete:
 *     md5(click_trans_id + service_id + secret_key + merchant_trans_id +
 *         merchant_prepare_id + amount + action + sign_time)
 */

const CHECKOUT_URL_BASE = "https://my.click.uz/services/pay";

export const PLACEHOLDER_MERCHANT_ID = "CHANGE_ME_CLICK_MERCHANT_ID";

/**
 * Are we currently configured with placeholder Click credentials? Used by the
 * billing UI to disable the checkout button rather than letting the user hit
 * a guaranteed-to-fail Click page.
 */
export function clickIsPlaceholder(): boolean {
  return env.CLICK_MERCHANT_ID === PLACEHOLDER_MERCHANT_ID;
}

interface CheckoutUrlArgs {
  amountUzs: number;
  invoiceId: string;
  returnUrl: string;
}

export function buildCheckoutUrl({ amountUzs, invoiceId, returnUrl }: CheckoutUrlArgs): string {
  const params = new URLSearchParams({
    service_id: env.CLICK_SERVICE_ID,
    merchant_id: env.CLICK_MERCHANT_ID,
    amount: amountUzs.toFixed(2),
    transaction_param: invoiceId,
    return_url: returnUrl,
    merchant_user_id: env.CLICK_MERCHANT_USER_ID,
  });
  return `${CHECKOUT_URL_BASE}?${params.toString()}`;
}

interface VerifyArgs {
  click_trans_id: string;
  service_id: string;
  merchant_trans_id: string;
  amount: string;
  action: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: string;
}

/**
 * Verify a Click webhook payload. Returns true when the provided sign_string
 * matches our recomputed MD5 digest. Action 0 (prepare) and action 1 (complete)
 * sign different field sets per Click's spec.
 */
export function verifyClickSignature(args: VerifyArgs): boolean {
  const isComplete = args.action === "1";
  const parts = [
    args.click_trans_id,
    args.service_id,
    env.CLICK_SECRET_KEY,
    args.merchant_trans_id,
    ...(isComplete ? [args.merchant_prepare_id ?? ""] : []),
    args.amount,
    args.action,
    args.sign_time,
  ];
  const expected = createHash("md5").update(parts.join("")).digest("hex");
  return expected.toLowerCase() === args.sign_string.toLowerCase();
}
