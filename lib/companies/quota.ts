import { createAdminClient } from "@/lib/supabase/admin";
import { INTERVIEW_QUESTIONS_MODEL_TAG } from "@/lib/gemini/interview-questions-types";
import type { Subscription, SubscriptionStatus } from "@/types";

export type QuotaReason =
  | "no_subscription"
  | "subscription_inactive"
  | "job_quota_exceeded"
  | "cv_quota_exceeded"
  | "interview_quota_exceeded"
  | "scheduling_quota_exceeded";

export const TRIAL_INTERVIEW_QUESTIONS_LIMIT = 10;
export const TRIAL_INTERVIEW_BOOKINGS_LIMIT = 3;

export interface QuotaState {
  status: SubscriptionStatus;
  trialEndsAt: string;
  daysRemaining: number;
  cvQuotaUsed: number;
  cvQuotaLimit: number;
  jobQuotaLimit: number;
  activeJobCount: number;
  canWrite: boolean;
}

/** Fetch the subscription row for a company (service role). */
export async function getSubscription(companyId: string): Promise<Subscription | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .single();
  return data;
}

/**
 * Aggregated quota state used by the billing page, sidebar banner, and the
 * /api/hr/quota endpoint.
 */
export async function getQuotaState(companyId: string): Promise<QuotaState | null> {
  const admin = createAdminClient();

  const [subResult, jobCountResult] = await Promise.all([
    admin.from("subscriptions").select("*").eq("company_id", companyId).single(),
    admin
      .from("job_postings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
  ]);

  if (!subResult.data) return null;

  const sub = subResult.data;
  const activeJobCount = jobCountResult.count ?? 0;
  const now = Date.now();
  const trialEnd = new Date(sub.trial_ends_at).getTime();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));

  const writable = isWritable(sub.status, trialEnd, now);

  return {
    status: sub.status,
    trialEndsAt: sub.trial_ends_at,
    daysRemaining,
    cvQuotaUsed: sub.cv_quota_used,
    cvQuotaLimit: sub.cv_quota_limit,
    jobQuotaLimit: sub.job_quota_limit,
    activeJobCount,
    canWrite: writable,
  };
}

/**
 * Can this company create a new job posting?
 * Pro is unlimited; trialing must be within trial_ends_at AND below the active-job cap.
 */
export async function canCreateJob(
  companyId: string,
): Promise<{ allowed: boolean; reason?: QuotaReason }> {
  const quota = await getQuotaState(companyId);
  if (!quota) return { allowed: false, reason: "no_subscription" };

  if (!quota.canWrite) {
    return { allowed: false, reason: "subscription_inactive" };
  }

  if (quota.status === "active") return { allowed: true };

  if (quota.activeJobCount >= quota.jobQuotaLimit) {
    return { allowed: false, reason: "job_quota_exceeded" };
  }

  return { allowed: true };
}

/**
 * Can this company process (AI-analyze) a new CV right now?
 * Used by the public apply route as a gate before enqueueing process-cv —
 * over-quota applies are still accepted into the system but skip Gemini.
 */
export async function canProcessCv(
  companyId: string,
): Promise<{ allowed: boolean; reason?: QuotaReason }> {
  const sub = await getSubscription(companyId);
  if (!sub) return { allowed: false, reason: "no_subscription" };

  if (sub.status === "active") return { allowed: true };

  const now = Date.now();
  const trialEnd = new Date(sub.trial_ends_at).getTime();

  if (!isWritable(sub.status, trialEnd, now)) {
    return { allowed: false, reason: "subscription_inactive" };
  }

  if (sub.cv_quota_used >= sub.cv_quota_limit) {
    return { allowed: false, reason: "cv_quota_exceeded" };
  }

  return { allowed: true };
}

/**
 * Atomically reserve one CV analysis slot for this company.
 * Service-role RPC: returns true when the slot was consumed (or the company
 * is on Pro), false when over-quota / inactive. The DB function holds a row
 * lock so concurrent applies cannot exceed the trial limit.
 */
export async function incrementCvQuota(companyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("try_consume_cv_quota", {
    p_company_id: companyId,
  });
  if (error) return false;
  return data === true;
}

/** Returns true when the subscription + company status allow mutating writes. */
export async function canWrite(companyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [subResult, companyResult] = await Promise.all([
    admin.from("subscriptions").select("*").eq("company_id", companyId).single(),
    admin.from("companies").select("status").eq("id", companyId).single(),
  ]);

  if (!subResult.data || !companyResult.data) return false;
  if (companyResult.data.status !== "active") return false;

  return isWritable(
    subResult.data.status,
    new Date(subResult.data.trial_ends_at).getTime(),
    Date.now(),
  );
}

/**
 * Can this company generate AI interview questions for a candidate right now?
 * Pro is unlimited; trialing is capped at 10 successful generations per
 * rolling 30 days. Counted from `ai_processing_attempts` rows tagged with
 * the interview-questions model marker.
 */
export async function canGenerateQuestions(companyId: string): Promise<{
  allowed: boolean;
  reason?: QuotaReason;
  used: number;
  limit: number;
}> {
  const sub = await getSubscription(companyId);
  if (!sub) {
    return {
      allowed: false,
      reason: "no_subscription",
      used: 0,
      limit: TRIAL_INTERVIEW_QUESTIONS_LIMIT,
    };
  }

  const now = Date.now();
  const trialEnd = new Date(sub.trial_ends_at).getTime();
  if (!isWritable(sub.status, trialEnd, now)) {
    return {
      allowed: false,
      reason: "subscription_inactive",
      used: 0,
      limit: TRIAL_INTERVIEW_QUESTIONS_LIMIT,
    };
  }

  if (sub.status === "active") {
    return { allowed: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }

  const admin = createAdminClient();
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("ai_processing_attempts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("model", INTERVIEW_QUESTIONS_MODEL_TAG)
    .eq("status", "success")
    .gte("created_at", since);

  const used = count ?? 0;
  if (used >= TRIAL_INTERVIEW_QUESTIONS_LIMIT) {
    return {
      allowed: false,
      reason: "interview_quota_exceeded",
      used,
      limit: TRIAL_INTERVIEW_QUESTIONS_LIMIT,
    };
  }

  return { allowed: true, used, limit: TRIAL_INTERVIEW_QUESTIONS_LIMIT };
}

/**
 * Can this company create another interview-scheduling request right now?
 * Pro is unlimited; trialing is capped at 3 booked interviews per rolling
 * 30 days. Counted from `interview_requests.booked_at`, status='booked'.
 */
export async function canScheduleInterview(companyId: string): Promise<{
  allowed: boolean;
  reason?: QuotaReason;
  used: number;
  limit: number;
}> {
  const sub = await getSubscription(companyId);
  if (!sub) {
    return {
      allowed: false,
      reason: "no_subscription",
      used: 0,
      limit: TRIAL_INTERVIEW_BOOKINGS_LIMIT,
    };
  }

  const now = Date.now();
  const trialEnd = new Date(sub.trial_ends_at).getTime();
  if (!isWritable(sub.status, trialEnd, now)) {
    return {
      allowed: false,
      reason: "subscription_inactive",
      used: 0,
      limit: TRIAL_INTERVIEW_BOOKINGS_LIMIT,
    };
  }

  if (sub.status === "active") {
    return { allowed: true, used: 0, limit: Number.POSITIVE_INFINITY };
  }

  const admin = createAdminClient();
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("interview_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "booked")
    .gte("booked_at", since);

  const used = count ?? 0;
  if (used >= TRIAL_INTERVIEW_BOOKINGS_LIMIT) {
    return {
      allowed: false,
      reason: "scheduling_quota_exceeded",
      used,
      limit: TRIAL_INTERVIEW_BOOKINGS_LIMIT,
    };
  }

  return { allowed: true, used, limit: TRIAL_INTERVIEW_BOOKINGS_LIMIT };
}

function isWritable(status: SubscriptionStatus, trialEndMs: number, nowMs: number): boolean {
  if (status === "active") return true;
  if (status === "trialing") return trialEndMs > nowMs;
  return false;
}
