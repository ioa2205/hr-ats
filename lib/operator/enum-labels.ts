import type { TranslationKey } from "@/lib/i18n/types";

/**
 * Maps raw DB enum values (company status, subscription status, role, severity,
 * processing status, etc.) to i18n keys. Used anywhere the operator UI surfaces
 * a backend value that would otherwise render hardcoded English.
 */
export function companyStatusKey(value: string): TranslationKey {
  switch (value) {
    case "active":
      return "operator.enum.status.active";
    case "suspended":
      return "operator.enum.status.suspended";
    case "deleted":
      return "operator.enum.status.deleted";
    default:
      return "operator.enum.plan.none";
  }
}

export function subscriptionStatusKey(value: string): TranslationKey {
  switch (value) {
    case "trialing":
      return "operator.enum.sub_status.trialing";
    case "active":
      return "operator.enum.sub_status.active";
    case "expired":
      return "operator.enum.sub_status.expired";
    case "cancelled":
      return "operator.enum.sub_status.cancelled";
    default:
      return "operator.enum.plan.none";
  }
}

export function planKey(value: string | null | undefined): TranslationKey {
  if (value === "trial") return "operator.enum.plan.trial";
  if (value === "pro") return "operator.enum.plan.pro";
  return "operator.enum.plan.none";
}

export function severityKey(value: string): TranslationKey {
  if (value === "info") return "operator.enum.severity.info";
  if (value === "warn") return "operator.enum.severity.warn";
  if (value === "critical") return "operator.enum.severity.critical";
  return "operator.enum.severity.info";
}

export function incidentStatusKey(value: string): TranslationKey {
  if (value === "firing") return "operator.enum.incident_status.firing";
  if (value === "acknowledged") return "operator.enum.incident_status.acknowledged";
  if (value === "resolved") return "operator.enum.incident_status.resolved";
  return "operator.enum.incident_status.firing";
}

export function operatorRoleKey(value: string): TranslationKey {
  if (value === "full") return "operator.enum.role.full";
  if (value === "read_only") return "operator.enum.role.read_only";
  return "operator.enum.role.full";
}

export function companyMemberRoleKey(value: string): TranslationKey {
  switch (value) {
    case "owner":
      return "operator.enum.role.owner";
    case "admin":
      return "operator.enum.role.admin";
    case "recruiter":
      return "operator.enum.role.recruiter";
    case "member":
      return "operator.enum.role.member";
    default:
      return "operator.enum.role.member";
  }
}

export function processingStatusKey(value: string): TranslationKey {
  switch (value) {
    case "success":
      return "operator.enum.proc_status.success";
    case "failed":
      return "operator.enum.proc_status.failed";
    case "rate_limited":
      return "operator.enum.proc_status.rate_limited";
    case "timeout":
      return "operator.enum.proc_status.timeout";
    default:
      return "operator.enum.proc_status.failed";
  }
}

export function jobStatusKey(value: string): TranslationKey {
  switch (value) {
    case "active":
      return "operator.enum.job_status.active";
    case "closed":
      return "operator.enum.job_status.closed";
    case "draft":
      return "operator.enum.job_status.draft";
    case "archived":
      return "operator.enum.job_status.archived";
    default:
      return "operator.enum.job_status.active";
  }
}

export function atRiskReasonKey(value: string): TranslationKey {
  switch (value) {
    case "past_due":
      return "operator.enum.reason.past_due";
    case "no_jobs":
      return "operator.enum.reason.no_jobs";
    case "no_logins_14d":
      return "operator.enum.reason.no_logins_14d";
    case "sole_seat":
      return "operator.enum.reason.sole_seat";
    default:
      return "operator.enum.reason.past_due";
  }
}
