/**
 * The DB-backed {@link TelegramReader} for company-OWNED intake channels.
 *
 * Unlike the MTProto reader (which reads live channel history for public
 * channels), this one reads from the `telegram_posts` staging table that the
 * bot ingest fills. Each post was already classified ONCE at ingest, so this
 * reader carries the cached classification through `ReaderMessage.cachedExtraction`
 * and the connector skips the paid Gemini call. It only surfaces posts the
 * ingest labelled `candidate_cv` with a parseable extraction — vacancies / ads /
 * noise stored for de-dup never reach the funnel.
 *
 * Pure + injected: the actual Supabase query is the {@link LoadTelegramPosts}
 * function (bound in index.ts), so the reader is unit-tested with a fake loader
 * and zero network.
 */
import { logger } from "@/lib/logger";
import { RawMessageSchema, TelegramExtractionZod } from "./schema";
import type { ReaderMessage, TelegramReader } from "./reader";

/** One staging row as the loader returns it (mirrors telegram_posts columns). */
export interface TelegramPostRow {
  channel: string;
  message_id: number;
  posted_at: string;
  text: string;
  url: string | null;
  classification: string | null;
  confidence: number | null;
  extraction: unknown;
}

/**
 * Loads classified posts for one owned channel newer than `sinceIso`, newest
 * first, capped at `limit`. Bound to a company-scoped Supabase query in index.ts.
 */
export type LoadTelegramPosts = (
  channel: string,
  sinceIso: string,
  limit: number,
) => Promise<TelegramPostRow[]>;

export class DbTelegramReader implements TelegramReader {
  private readonly load: LoadTelegramPosts;
  private readonly limit: number;

  constructor(load: LoadTelegramPosts, limit: number) {
    this.load = load;
    this.limit = limit;
  }

  async *listMessages(channel: string, sinceDate: Date): AsyncIterable<ReaderMessage> {
    const handle = channel.trim().replace(/^@/, "").toLowerCase();
    const rows = await this.load(handle, sinceDate.toISOString(), this.limit);

    for (const row of rows) {
      // Defensive: the index already filters to candidate_cv, but never surface
      // a vacancy/ad even if the query widens.
      if (row.classification !== "candidate_cv") continue;

      // Fail-closed: a row whose cached extraction no longer parses is dropped
      // (it would otherwise need a live re-classify we deliberately avoid here).
      const extraction = TelegramExtractionZod.safeParse(row.extraction);
      if (!extraction.success) {
        logger.warn(
          { channel: handle, id: row.message_id },
          "[sourcing] telegram cached extraction failed schema; dropping",
        );
        continue;
      }

      const envelope = RawMessageSchema.safeParse({
        channel: handle,
        message_id: row.message_id,
        posted_at: row.posted_at,
        text: row.text,
        url: row.url,
      });
      if (!envelope.success) {
        logger.warn({ channel: handle, id: row.message_id }, "[sourcing] telegram db row failed envelope");
        continue;
      }

      yield { ...envelope.data, cachedExtraction: extraction.data };
    }
  }
}
