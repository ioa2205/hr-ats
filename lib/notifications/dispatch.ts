import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/send";
import { renderNotificationEmail } from "@/lib/email/templates/notification";
import { hourOf, isWithinQuietHours } from "./quiet-hours";
import type { Locale } from "@/lib/i18n/types";
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
  /** Deep-link path appended to APP_URL for the email CTA (default dashboard). */
  actionPath?: string;
}

const emailColumn: Record<Event, keyof PrefsRow> = {
  new_application: "email_new_application",
  top_pick: "email_top_pick",
  interview_booked: "email_interview_booked",
  interview_declined: "email_interview_declined",
  ai_failed: "email_weekly_digest",
  quota_warning: "email_quota_warning",
  sourcing_complete: "email_sourcing_complete",
  sourcing_failed: "email_sourcing_failed",
};

const inappColumn: Record<Event, keyof PrefsRow> = {
  new_application: "inapp_new_application",
  top_pick: "inapp_top_pick",
  interview_booked: "inapp_interview_booked",
  interview_declined: "inapp_interview_declined",
  ai_failed: "inapp_ai_failed",
  quota_warning: "inapp_new_application",
  sourcing_complete: "inapp_sourcing_complete",
  sourcing_failed: "inapp_sourcing_failed",
};

type PrefsRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

function nextQuietHoursEnd(now: Date, endHour: number): Date {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  if (hourOf(now) >= endHour) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(endHour);
  return next;
}

/**
 * Fan out one event to every eligible recipient. Email deliveries persist to
 * notification_deliveries with status tracking; in-app rows land in
 * notifications and stream via Realtime. Bounced/complained addresses are
 * skipped via notification_suppressions. Events raised during a recipient's
 * quiet hours are queued with next_retry_at = end of window.
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
    logger.error({ err: recErr, companyId: input.companyId, event: input.event }, "[notifications] recipient lookup failed");
    return;
  }

  const userIds = recipients.map((r) => r.user_id);
  if (userIds.length === 0) return;

  const [{ data: prefRows }, { data: profiles }, { data: company }] = await Promise.all([
    admin
      .from("notification_preferences")
      .select("*")
      .eq("company_id", input.companyId)
      .in("user_id", userIds),
    admin.from("profiles").select("id, email, locale").in("id", userIds),
    admin.from("companies").select("id, name, default_locale").eq("id", input.companyId).single(),
  ]);

  const prefByUser = new Map((prefRows ?? []).map((p) => [p.user_id, p]));
  const profileByUser = new Map((profiles ?? []).map((p) => [p.id, p]));
  const now = new Date();
  const currentHour = hourOf(now);

  const inappInserts: Database["public"]["Tables"]["notifications"]["Insert"][] = [];

  // Collect recipient emails so we can batch the suppression lookup.
  const emailsToCheck = Array.from(
    new Set(
      userIds
        .map((uid) => profileByUser.get(uid)?.email)
        .filter((e): e is string => Boolean(e)),
    ),
  );
  const suppressed = new Set<string>();
  if (emailsToCheck.length > 0) {
    const { data: suppressions } = await admin
      .from("notification_suppressions")
      .select("email")
      .in("email", emailsToCheck);
    for (const s of suppressions ?? []) suppressed.add(s.email);
  }

  for (const userId of userIds) {
    const prefs = prefByUser.get(userId);
    const profile = profileByUser.get(userId);
    const emailKey = emailColumn[input.event];
    const inappKey = inappColumn[input.event];
    const emailOn = prefs ? Boolean(prefs[emailKey]) : true;
    const inappOn = prefs ? Boolean(prefs[inappKey]) : true;
    const quiet = prefs
      ? isWithinQuietHours(currentHour, prefs.quiet_hours_start, prefs.quiet_hours_end)
      : false;

    // ── In-app channel ──────────────────────────────────────────────
    if (inappOn && !quiet) {
      inappInserts.push({
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

    // ── Email channel ───────────────────────────────────────────────
    if (!emailOn) continue;
    if (!profile?.email) continue;
    if (suppressed.has(profile.email)) {
      await admin.from("notification_deliveries").insert({
        company_id: input.companyId,
        user_id: userId,
        recipient_email: profile.email,
        event: input.event,
        subject: `[suppressed] ${input.title}`,
        status: "suppressed",
        last_error: "address in notification_suppressions",
      });
      continue;
    }

    const locale = (profile.locale ?? company?.default_locale ?? "ru") as Locale;
    const rendered = renderNotificationEmail(input.event, {
      locale,
      title: input.title,
      body: input.body,
      actionUrl: `${env.APP_URL}${input.actionPath ?? "/hr/dashboard"}`,
      companyName: company?.name ?? undefined,
    });

    // Quiet hours: queue for later retry pass.
    if (quiet) {
      const retryAt =
        prefs?.quiet_hours_end !== null && prefs?.quiet_hours_end !== undefined
          ? nextQuietHoursEnd(now, prefs.quiet_hours_end)
          : new Date(now.getTime() + 60 * 60 * 1000);
      await admin.from("notification_deliveries").insert({
        company_id: input.companyId,
        user_id: userId,
        recipient_email: profile.email,
        event: input.event,
        subject: rendered.subject,
        body_html: rendered.html,
        status: "queued",
        next_retry_at: retryAt.toISOString(),
      });
      continue;
    }

    // Live send: insert row, then attempt, then update.
    const { data: delivery, error: delErr } = await admin
      .from("notification_deliveries")
      .insert({
        company_id: input.companyId,
        user_id: userId,
        recipient_email: profile.email,
        event: input.event,
        subject: rendered.subject,
        body_html: rendered.html,
        status: "sending",
        attempts: 1,
      })
      .select("id")
      .single();

    if (delErr || !delivery) {
      logger.error({ err: delErr, userId }, "[notifications] delivery insert failed");
      continue;
    }

    const send = await sendEmail({
      to: profile.email,
      subject: rendered.subject,
      html: rendered.html,
    });

    await admin
      .from("notification_deliveries")
      .update(
        send.ok
          ? {
              status: "sent",
              sent_at: new Date().toISOString(),
              resend_message_id: send.messageId ?? null,
            }
          : {
              status: "failed",
              last_error: send.error ?? "unknown",
              next_retry_at: computeNextRetryAt(1).toISOString(),
            },
      )
      .eq("id", delivery.id);
  }

  if (inappInserts.length > 0) {
    const { error: insErr } = await admin.from("notifications").insert(inappInserts);
    if (insErr) {
      logger.error({ err: insErr, count: inappInserts.length }, "[notifications] insert failed");
    }
  }
}

/** Exponential back-off: 1m, 5m, 30m; then DLQ (caller decides). */
export function computeNextRetryAt(attempt: number, base: Date = new Date()): Date {
  const mins = attempt <= 1 ? 1 : attempt === 2 ? 5 : 30;
  return new Date(base.getTime() + mins * 60 * 1000);
}
