import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { hourOf, isWithinQuietHours } from "./quiet-hours";
import type { Database } from "@/types/supabase";

type Event = Database["public"]["Enums"]["notification_event_kind"];

interface DispatchInput {
  companyId: string;
  event: Event;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Restrict the dispatch to a single recipient (e.g. per-user event). */
  userIds?: string[];
}

/**
 * Per-event preference column lookup. When prefs row is missing, defaults
 * mirror the migration defaults: every channel on, digest at 09:00, no quiet
 * hours.
 */
const emailColumn: Record<Event, keyof PrefsRow> = {
  new_application: "email_new_application",
  top_pick: "email_top_pick",
  interview_booked: "email_interview_booked",
  interview_declined: "email_interview_declined",
  ai_failed: "email_weekly_digest",
  quota_warning: "email_quota_warning",
};

const inappColumn: Record<Event, keyof PrefsRow> = {
  new_application: "inapp_new_application",
  top_pick: "inapp_top_pick",
  interview_booked: "inapp_interview_booked",
  interview_declined: "inapp_interview_declined",
  ai_failed: "inapp_ai_failed",
  quota_warning: "inapp_new_application",
};

type PrefsRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

/**
 * Fan out one event to every eligible recipient. Email is logged-only in v1;
 * in-app rows are inserted into `notifications` and stream via Realtime.
 * Events raised during a user's quiet hours are queued (logged) rather than
 * surfaced as a banner.
 */
export async function dispatchNotification(input: DispatchInput): Promise<void> {
  const admin = createAdminClient();

  const recipientsQuery = admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", input.companyId);
  if (input.userIds && input.userIds.length > 0) {
    recipientsQuery.in("user_id", input.userIds);
  }
  const { data: recipients, error: recErr } = await recipientsQuery;
  if (recErr || !recipients) {
    logger.error({ err: recErr, input }, "[notifications] recipient lookup failed");
    return;
  }

  const userIds = recipients.map((r) => r.user_id);
  if (userIds.length === 0) return;

  const { data: prefRows } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("company_id", input.companyId)
    .in("user_id", userIds);

  const prefByUser = new Map((prefRows ?? []).map((p) => [p.user_id, p]));
  const now = new Date();
  const currentHour = hourOf(now);

  const inserts: Database["public"]["Tables"]["notifications"]["Insert"][] = [];

  for (const userId of userIds) {
    const prefs = prefByUser.get(userId);
    const emailKey = emailColumn[input.event];
    const inappKey = inappColumn[input.event];
    const emailOn = prefs ? Boolean(prefs[emailKey]) : true;
    const inappOn = prefs ? Boolean(prefs[inappKey]) : true;
    const quiet = prefs
      ? isWithinQuietHours(currentHour, prefs.quiet_hours_start, prefs.quiet_hours_end)
      : false;

    if (emailOn) {
      logger.info(
        {
          channel: "email",
          event: input.event,
          userId,
          companyId: input.companyId,
          queued: quiet,
          metadata: input.metadata ?? null,
        },
        "[notifications] dispatch intent",
      );
    } else {
      logger.info(
        { channel: "email", event: input.event, userId, suppressed: "pref_off" },
        "[notifications] suppressed",
      );
    }

    if (!inappOn) {
      logger.info(
        { channel: "inapp", event: input.event, userId, suppressed: "pref_off" },
        "[notifications] suppressed",
      );
      continue;
    }
    if (quiet) {
      logger.info(
        { channel: "inapp", event: input.event, userId, suppressed: "quiet_hours" },
        "[notifications] suppressed",
      );
      continue;
    }

    inserts.push({
      company_id: input.companyId,
      user_id: userId,
      event: input.event,
      title: input.title,
      body: input.body ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: (input.metadata as never) ?? null,
    });
  }

  if (inserts.length === 0) return;

  const { error: insErr } = await admin.from("notifications").insert(inserts);
  if (insErr) {
    logger.error({ err: insErr, count: inserts.length }, "[notifications] insert failed");
  }
}
