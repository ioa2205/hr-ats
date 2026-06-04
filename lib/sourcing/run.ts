/**
 * runSourcingSearch — the background worker body (Phase 1.4 vehicle).
 *
 * Invoked by the trigger route's after() (immediate kick) and by the pickup /
 * stuck-run cron. Idempotent + crash-safe by construction: an atomic claim
 * (claim_sourcing_search) flips queued/stale-running → running so only one
 * worker proceeds; a caught failure either re-queues (cron retries, profile
 * already frozen) or, past MAX_ATTEMPTS, fails loudly with a refund + a
 * sourcing_failed notification — never hangs in running. Persistence of the
 * shortlist is delete-then-insert so a resume re-derives deterministically.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { refundSourcingQuota, SOURCING_UNITS_PER_SEARCH } from "@/lib/companies/quota";
import { t } from "@/lib/i18n";
import { runFunnel, type FunnelDeps, type ShortlistEntry } from "./funnel";
import { createGeminiFunnelMethods } from "./gemini";
import {
  createInternalPoolConnector,
  type LoadPoolCandidates,
  type PoolCandidateRow,
} from "./connectors/internal-pool";
import { createHhConnectorForCompany } from "./connectors/hh";
import {
  createTelegramConnectorFromEnv,
  createTelegramDbConnector,
  telegramBotIntakeConfigured,
  telegramConfiguredFromEnv,
} from "./connectors/telegram";
import type { LoadTelegramPosts } from "./connectors/telegram/db-reader";
import { normalizePhone } from "./identity";
import type { PostingSeed } from "./requirement-profile";
import type { FetchBudget, RequirementProfile, SourceConnector } from "./types";
import type { HardRequirement } from "@/types";
import type { Json, Database } from "@/types/supabase";
import type { Locale } from "@/lib/i18n/types";

type SearchRow = Database["public"]["Tables"]["sourcing_searches"]["Row"];
type AdminClient = ReturnType<typeof createAdminClient>;

const MAX_ATTEMPTS = 3;
const DEFAULT_BUDGET: FetchBudget = {
  maxFetched: 200,
  maxProCalls: 60,
  tokenCeiling: 4_000_000,
};

function truncate(str: string, max = 500): string {
  return str.length > max ? str.slice(0, max) : str;
}

function makePoolLoader(
  admin: AdminClient,
  companyId: string,
  excludeJobPostingId: string,
): LoadPoolCandidates {
  return async (limit) => {
    const { data: jobs } = await admin.from("job_postings").select("id").eq("company_id", companyId);
    const jobIds = (jobs ?? [])
      .map((job: { id: string }) => job.id)
      .filter((id: string) => id !== excludeJobPostingId);
    if (jobIds.length === 0) return [];

    const { data } = await admin
      .from("candidates")
      .select(
        "id, full_name, phone_number, language_detected, requirements_snapshot, requirements_responses, strengths, one_line_summary",
      )
      .in("job_posting_id", jobIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map(
      (row): PoolCandidateRow => ({
        id: row.id,
        full_name: row.full_name,
        phone_number: row.phone_number,
        language_detected: row.language_detected ?? null,
        requirements_snapshot: (row.requirements_snapshot ?? null) as HardRequirement[] | null,
        requirements_responses: (row.requirements_responses ?? null) as Record<string, string> | null,
        strengths: row.strengths ?? null,
        one_line_summary: row.one_line_summary ?? null,
      }),
    );
  };
}

/**
 * Build a company-scoped "already known" predicate for the Telegram connector:
 * contacts (phone / @handle / email) that are already applicants to any of the
 * company's jobs OR were sourced before are suppressed, so a search never
 * re-surfaces someone the company already has. Keys mirror the connector's
 * ExtractedContact.key format (`tg:@handle` / `tel:digits` / `eml:email`).
 */
async function makeKnownTelegramContacts(
  admin: AdminClient,
  companyId: string,
): Promise<(key: string) => boolean> {
  const keys = new Set<string>();

  const { data: jobs } = await admin.from("job_postings").select("id").eq("company_id", companyId);
  const jobIds = (jobs ?? []).map((job: { id: string }) => job.id);
  if (jobIds.length > 0) {
    const { data: cands } = await admin
      .from("candidates")
      .select("phone_number")
      .in("job_posting_id", jobIds);
    for (const row of cands ?? []) {
      const digits = normalizePhone(row.phone_number ?? "");
      if (digits.length >= 9) keys.add(`tel:${digits}`);
    }
  }

  const { data: sourced } = await admin
    .from("sourced_candidates")
    .select("contact")
    .eq("company_id", companyId);
  for (const row of sourced ?? []) {
    const contact = (row.contact ?? null) as {
      phone?: string | null;
      email?: string | null;
      telegram?: string | null;
    } | null;
    if (!contact) continue;
    if (contact.telegram) keys.add(`tg:${contact.telegram.toLowerCase()}`);
    const digits = normalizePhone(contact.phone ?? "");
    if (digits.length >= 9) keys.add(`tel:${digits}`);
    if (contact.email) keys.add(`eml:${contact.email.toLowerCase()}`);
  }

  return (key: string) => keys.has(key);
}

/** The company's active OWNED intake channel handles (lowercased, no '@'). */
async function loadCompanyIntakeChannels(admin: AdminClient, companyId: string): Promise<string[]> {
  const { data } = await admin
    .from("telegram_intake_channels")
    .select("handle")
    .eq("company_id", companyId)
    .eq("active", true);
  return (data ?? []).map((row: { handle: string }) => row.handle);
}

/**
 * Company-scoped loader over telegram_posts for the DB connector: newest
 * pre-classified candidate_cv posts for one owned channel within the freshness
 * window. RLS is moot here (admin client), so the company_id filter is the
 * tenant boundary.
 */
function makeTelegramPostLoader(admin: AdminClient, companyId: string): LoadTelegramPosts {
  return async (channel, sinceIso, limit) => {
    const { data } = await admin
      .from("telegram_posts")
      .select("channel, message_id, posted_at, text, url, classification, confidence, extraction")
      .eq("company_id", companyId)
      .eq("channel", channel)
      .eq("classification", "candidate_cv")
      .gte("posted_at", sinceIso)
      .order("posted_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => ({
      channel: row.channel,
      message_id: row.message_id,
      posted_at: row.posted_at,
      text: row.text,
      url: row.url,
      classification: row.classification,
      confidence: row.confidence,
      extraction: row.extraction,
    }));
  };
}

function toRow(
  searchId: string,
  companyId: string,
  entry: ShortlistEntry,
): Database["public"]["Tables"]["sourced_candidates"]["Insert"] {
  return {
    company_id: companyId,
    sourcing_search_id: searchId,
    source: entry.source,
    source_ref: entry.source_ref,
    identity_key: entry.identity_key,
    profile: entry.profile as unknown as Json,
    requirement_results: entry.requirement_results as unknown as Json,
    meets_all_requirements: entry.meets_all_requirements,
    score: entry.score,
    score_breakdown: entry.score_breakdown as unknown as Json,
    rank: entry.rank,
    contact: entry.contact as unknown as Json,
    verified: entry.verified,
  };
}

async function companyLocale(admin: AdminClient, companyId: string): Promise<Locale> {
  const { data } = await admin
    .from("companies")
    .select("default_locale")
    .eq("id", companyId)
    .single();
  const locale = data?.default_locale;
  return locale === "uz" || locale === "en" ? locale : "ru";
}

async function notifyComplete(
  admin: AdminClient,
  search: SearchRow,
  jobTitle: string,
  count: number,
): Promise<void> {
  const locale = await companyLocale(admin, search.company_id);
  await dispatchNotification({
    companyId: search.company_id,
    event: "sourcing_complete",
    title: t("sourcing.notify.complete_title", locale, { job: jobTitle }),
    body: t("sourcing.notify.complete_body", locale, { count: String(count), job: jobTitle }),
    entityType: "sourcing_search",
    entityId: search.id,
    actionPath: `/hr/jobs/${search.job_posting_id}/sourcing/${search.id}`,
  });
}

async function notifyFailed(admin: AdminClient, search: SearchRow, jobTitle: string): Promise<void> {
  const locale = await companyLocale(admin, search.company_id);
  await dispatchNotification({
    companyId: search.company_id,
    event: "sourcing_failed",
    title: t("sourcing.notify.failed_title", locale, { job: jobTitle }),
    body: t("sourcing.notify.failed_body", locale, { job: jobTitle }),
    entityType: "sourcing_search",
    entityId: search.id,
    actionPath: `/hr/jobs/${search.job_posting_id}/sourcing/${search.id}`,
  });
}

async function failSearch(
  admin: AdminClient,
  search: SearchRow,
  reason: string,
  jobTitle: string,
): Promise<void> {
  await admin
    .from("sourcing_searches")
    .update({ status: "failed", error: truncate(reason), completed_at: new Date().toISOString() })
    .eq("id", search.id);
  // Refund the consumed unit so an infra/connector failure doesn't burn a slot.
  await refundSourcingQuota(search.company_id, SOURCING_UNITS_PER_SEARCH);
  await notifyFailed(admin, search, jobTitle);
}

export async function runSourcingSearch(searchId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: claimedRaw, error: claimErr } = await admin.rpc("claim_sourcing_search", {
    p_id: searchId,
    p_stale_minutes: 10,
  });
  if (claimErr) {
    logger.error({ err: claimErr, searchId }, "[sourcing] claim rpc failed");
    return;
  }
  const claimed = (claimedRaw ?? null) as SearchRow | null;
  if (!claimed) {
    logger.info({ searchId }, "[sourcing] claim skipped — already owned or not found");
    return;
  }

  // Resolve the job title up front for notifications even on the failure path.
  const { data: posting } = await admin
    .from("job_postings")
    .select("title, description, required_skills, hard_requirements")
    .eq("id", claimed.job_posting_id)
    .single();
  const jobTitle: string = posting?.title ?? "—";

  if (claimed.attempts > MAX_ATTEMPTS) {
    logger.warn({ searchId, attempts: claimed.attempts }, "[sourcing] max attempts exceeded");
    await failSearch(admin, claimed, "max_attempts_exceeded", jobTitle);
    return;
  }

  try {
    if (!posting) throw new Error("job_posting_not_found");

    const seed: PostingSeed = {
      title: posting.title,
      description: posting.description,
      required_skills: (posting.required_skills ?? []) as string[],
      hard_requirements: (posting.hard_requirements ?? []) as HardRequirement[],
    };

    const loader = makePoolLoader(admin, claimed.company_id, claimed.job_posting_id);
    const connectors: SourceConnector[] = [createInternalPoolConnector(loader)];
    // hh.uz joins when this company has an employer OAuth connection, or when
    // the platform fallback connection is enabled. A failing connector degrades
    // the run to `partial` (handled in the funnel) rather than failing it.
    const hh = await createHhConnectorForCompany(claimed.company_id);
    if (hh) connectors.push(hh);
    // Telegram joins automatically via two independent paths, both suppressing
    // contacts the company already has so a search never re-surfaces a known
    // candidate. The known-contact set is built once and shared:
    //   • MTProto user session  → PUBLIC channels (TELEGRAM_* env creds);
    //   • bot intake (DB reader) → the company's OWNED channels (registered in
    //     telegram_intake_channels, ingested by the bot — no MTProto needed).
    const mtprotoOn = telegramConfiguredFromEnv();
    const ownedChannels = telegramBotIntakeConfigured()
      ? await loadCompanyIntakeChannels(admin, claimed.company_id)
      : [];
    if (mtprotoOn || ownedChannels.length > 0) {
      const isKnownContact = await makeKnownTelegramContacts(admin, claimed.company_id);
      if (mtprotoOn) {
        const telegram = createTelegramConnectorFromEnv({ isKnownContact });
        if (telegram) connectors.push(telegram);
      }
      if (ownedChannels.length > 0) {
        connectors.push(
          createTelegramDbConnector({
            load: makeTelegramPostLoader(admin, claimed.company_id),
            channels: ownedChannels,
            isKnownContact,
          }),
        );
      }
    }

    const deps: FunnelDeps = {
      connectors,
      ...createGeminiFunnelMethods(),
      logger,
      onProfileFrozen: async (profile) => {
        await admin
          .from("sourcing_searches")
          .update({ requirement_profile: profile as unknown as Json })
          .eq("id", searchId);
      },
      onProgress: async (stats, cost) => {
        await admin
          .from("sourcing_searches")
          .update({
            stats: stats as unknown as Json,
            input_tokens: cost.inputTokens,
            output_tokens: cost.outputTokens,
            cost_usd: cost.costUsd,
          })
          .eq("id", searchId);
      },
    };

    const frozenProfile = (claimed.requirement_profile ?? null) as RequirementProfile | null;

    const result = await runFunnel({ posting: seed, frozenProfile, budget: DEFAULT_BUDGET }, deps);

    // Idempotent persist: clear any prior rows for this search, then insert.
    await admin.from("sourced_candidates").delete().eq("sourcing_search_id", searchId);
    if (result.shortlist.length > 0) {
      const { error: insErr } = await admin
        .from("sourced_candidates")
        .insert(result.shortlist.map((entry) => toRow(searchId, claimed.company_id, entry)));
      if (insErr) throw new Error(`persist_failed: ${insErr.message}`);
    }

    await admin
      .from("sourcing_searches")
      .update({
        status: result.status,
        stats: result.stats as unknown as Json,
        input_tokens: result.cost.inputTokens,
        output_tokens: result.cost.outputTokens,
        cost_usd: result.cost.costUsd,
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", searchId);

    logger.info(
      { searchId, shortlisted: result.shortlist.length, status: result.status },
      "[sourcing] run complete",
    );
    await notifyComplete(admin, claimed, jobTitle, result.shortlist.length);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, searchId }, "[sourcing] run failed");
    if (claimed.attempts >= MAX_ATTEMPTS) {
      await failSearch(admin, claimed, message, jobTitle);
    } else {
      // Re-queue: the pickup cron retries; the frozen profile is reused so the
      // extraction Pro call is not repeated.
      await admin
        .from("sourcing_searches")
        .update({ status: "queued", error: truncate(message) })
        .eq("id", searchId);
    }
  }
}
