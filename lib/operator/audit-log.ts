import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type OperatorAuditAction =
  | "operator.impersonate.start"
  | "operator.impersonate.end"
  | "operator.company.suspend"
  | "operator.company.resume"
  | "operator.template.create"
  | "operator.template.update"
  | "operator.template.delete"
  | "operator.promotion.propose"
  | "operator.promotion.approve"
  | "operator.promotion.reject"
  | "operator.subscription_upgrade.approve"
  | "operator.subscription_upgrade.reject"
  | "operator.grant.bootstrap"
  | "operator.platform_setting.update";

interface WriteOperatorAuditArgs {
  actorUserId: string;
  action: OperatorAuditAction;
  targetCompanyId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append an entry to operator_audit_log. Failures are logged but don't throw
 * — audit writes must not break the user-visible operator flow. Service-role
 * only; the table RLS blocks authenticated inserts.
 */
export async function writeOperatorAudit(args: WriteOperatorAuditArgs): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("operator_audit_log").insert({
      actor_user_id: args.actorUserId,
      action: args.action,
      target_company_id: args.targetCompanyId ?? null,
      target_user_id: args.targetUserId ?? null,
      metadata: args.metadata ?? {},
      ip: args.ip ?? null,
      user_agent: args.userAgent ?? null,
    });
    if (error) {
      logger.error(
        { context: "operator-audit", err: error, action: args.action },
        "Failed to write operator audit entry",
      );
    }
  } catch (err) {
    logger.error(
      { context: "operator-audit", err, action: args.action },
      "Unexpected error writing operator audit entry",
    );
  }
}

/** Extract `ip` and `user_agent` from a Next.js Request/Headers surface. */
export function extractRequestContext(headers: Headers): {
  ip: string | null;
  userAgent: string | null;
} {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;
  const userAgent = headers.get("user-agent");
  return { ip, userAgent };
}
