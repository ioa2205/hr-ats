/**
 * The Telegram SourceConnector. Drives the full per-channel pipeline and yields
 * normalized candidate records; it never judges (the funnel's gate/score/verify
 * do). Everything it depends on — the reader (MTProto), the AI classifier, the
 * clock, the already-known suppression set — is injected, so the connector is
 * unit-tested with fakes and zero network. index.ts binds the live deps.
 *
 * Pipeline (all anti-staleness rules applied BEFORE the paid AI step, to cap
 * cost and surface only fresh candidates):
 *   1. read messages per allow-listed channel newer than the age cutoff;
 *   2. hard recency cutoff + closed-signal drop + cheap pre-filter
 *      (contact handle required, role/skill signal, not an ad);
 *   3. already-known suppression (skip contacts the company already has);
 *   4. repost-collapse / latest-wins across channels by contact handle;
 *   5. AI classify+extract (budget-capped) — keep only high-confidence
 *      candidate_cv; recruiter vacancies / ads / other are dropped;
 *   6. normalize to a provenance-tagged record and yield.
 */
import type { RawSourcedProfile, SourceConnector } from "../../types";
import type { SourcingLogger } from "../../funnel";
import type { TelegramReader } from "./reader";
import type { RawMessage, TelegramExtraction } from "./schema";
import { prefilter, type ExtractedContact } from "./classify";
import { collapseReposts, isClosedSignal, withinAgeWindow } from "./recency";
import { normalizeTelegramMessage } from "./normalize";

/** Injected AI classify+extract. Returns a validated extraction or throws. */
export type TelegramClassifier = (text: string) => Promise<TelegramExtraction>;

export interface TelegramConnectorDeps {
  /** null when unconfigured ⇒ the connector yields nothing. */
  reader: TelegramReader | null;
  classify: TelegramClassifier;
  isConfigured: () => boolean;
  /** allow-list of channel handles to monitor (with or without a leading '@'). */
  channels: string[];
  /** ignore any post older than this many days. */
  maxAgeDays: number;
  /** hard cap on messages pulled per channel per run. */
  perChannelLimit: number;
  /** drop classification results below this confidence (fail-closed). */
  minConfidence?: number;
  /** skip contacts already known to the company (candidates / sourced). */
  isKnownContact?: (contactKey: string) => boolean;
  now?: () => number;
  logger?: SourcingLogger;
}

const DEFAULT_MIN_CONFIDENCE = 0.6;

interface Survivor {
  message: RawMessage;
  contact: ExtractedContact;
}

export function createTelegramConnector(deps: TelegramConnectorDeps): SourceConnector {
  const minConfidence = deps.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const now = deps.now ?? Date.now;
  const log = deps.logger;

  return {
    kind: "telegram",
    isConfigured: deps.isConfigured,
    async *fetch(_profile, budget): AsyncIterable<RawSourcedProfile> {
      const reader = deps.reader;
      if (!deps.isConfigured() || reader === null || deps.channels.length === 0) return;

      const nowMs = now();
      const sinceDate = new Date(nowMs - deps.maxAgeDays * 86_400_000);

      // --- Stages 1–3: fetch + recency + pre-filter + known-suppression ----
      const survivors: Survivor[] = [];
      const errors: unknown[] = [];
      for (const channel of deps.channels) {
        try {
          for await (const message of reader.listMessages(channel, sinceDate)) {
            // Hard recency cutoff (defensive — the reader already stops at it).
            if (!withinAgeWindow(message.posted_at, deps.maxAgeDays, nowMs)) continue;
            // "Done looking" posts are dropped outright.
            if (isClosedSignal(message.text)) continue;
            const pf = prefilter(message.text);
            if (!pf.keep || pf.contact === null) continue;
            // Already-known suppression: don't re-surface someone we already have.
            if (deps.isKnownContact?.(pf.contact.key)) continue;
            survivors.push({ message, contact: pf.contact });
          }
        } catch (err) {
          // One bad channel (renamed/private) must not lose the others; record
          // it and continue. If EVERY channel fails we rethrow below so the
          // funnel degrades the run to `partial`.
          errors.push(err);
          log?.warn({ channel, err: String(err) }, "[sourcing] telegram channel read failed");
        }
      }
      if (deps.channels.length > 0 && errors.length === deps.channels.length) {
        throw errors[0];
      }

      // --- Stage 4: repost-collapse / latest-wins by contact handle --------
      const collapsed = collapseReposts(
        survivors,
        (s) => s.contact.key,
        (s) => s.message.posted_at,
      );

      // --- Stages 5–6: AI classify (budget-capped) + normalize + yield -----
      // budget.maxFetched caps how many messages reach the paid AI step.
      let classifyCalls = 0;
      let emitted = 0;
      for (const survivor of collapsed) {
        if (emitted >= budget.maxFetched || classifyCalls >= budget.maxFetched) break;
        classifyCalls += 1;
        let extraction: TelegramExtraction;
        try {
          extraction = await deps.classify(survivor.message.text);
        } catch (err) {
          // Fail-closed: a classify/parse failure drops the single message.
          log?.warn(
            { ref: `${survivor.message.channel}:${survivor.message.message_id}`, err: String(err) },
            "[sourcing] telegram classify failed; dropping message",
          );
          continue;
        }
        // Reject recruiter vacancies, ads, noise, and low-confidence calls.
        if (extraction.classification !== "candidate_cv") continue;
        if (extraction.confidence < minConfidence) continue;
        yield normalizeTelegramMessage(survivor.message, extraction, survivor.contact, nowMs);
        emitted += 1;
      }
    },
  };
}
