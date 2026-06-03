/**
 * The injected boundary between the pure Telegram pipeline and the live MTProto
 * client. Everything above this interface (recency, classify, normalize,
 * connector) is tested with fakes and runs with NO network; only the GramJS
 * implementation here ever talks to Telegram, and only when API credentials +
 * a user session string are present.
 *
 * Why MTProto (GramJS), not the Bot API: a bot only sees messages posted AFTER
 * it joins a channel and gives almost no history — useless for sourcing. An
 * MTProto USER client (api_id + api_hash + a session string) reads full channel
 * history for the public job/CV channels the HR user already follows. That is
 * heavier and needs a real session, so it lives behind {@link TelegramReader}.
 *
 * The GramJS package is loaded lazily (dynamic import inside connect) so an
 * unconfigured run — the common case — never pulls the heavy client into memory,
 * and the unit tests (which inject a fake reader) never resolve it at all.
 */
import type { TelegramClient } from "telegram";
import { logger } from "@/lib/logger";
import { RawMessageSchema, type RawMessage } from "./schema";

/**
 * Reads messages from one allow-listed channel newer than `sinceDate`, newest
 * first. The pipeline depends ONLY on this interface; in tests it is a fake
 * async generator, in prod it is {@link GramJsTelegramReader}.
 */
export interface TelegramReader {
  listMessages(channel: string, sinceDate: Date): AsyncIterable<RawMessage>;
}

export interface GramJsReaderConfig {
  apiId: number;
  apiHash: string;
  /** MTProto user session string (StringSession). */
  session: string;
  /** hard cap on messages pulled per channel per run. */
  perChannelLimit: number;
}

/** Drop a leading '@' so "@ish_uz" and "ish_uz" resolve to the same channel. */
function normalizeChannel(channel: string): string {
  return channel.trim().replace(/^@/, "");
}

/**
 * GramJS-backed reader. Real, but only instantiated by index.ts when the env
 * credentials exist. Connects lazily and reuses the connection across channels
 * within a run.
 */
export class GramJsTelegramReader implements TelegramReader {
  private readonly cfg: GramJsReaderConfig;
  private client: TelegramClient | null = null;

  constructor(cfg: GramJsReaderConfig) {
    this.cfg = cfg;
  }

  private async connect(): Promise<TelegramClient> {
    if (this.client) return this.client;
    // Lazy: pull GramJS in only on a configured, live run.
    const { TelegramClient: Client } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
    const client = new Client(new StringSession(this.cfg.session), this.cfg.apiId, this.cfg.apiHash, {
      connectionRetries: 5,
    });
    // The session already carries the authorized user; no interactive login.
    await client.connect();
    this.client = client;
    return client;
  }

  async *listMessages(channel: string, sinceDate: Date): AsyncIterable<RawMessage> {
    const handle = normalizeChannel(channel);
    const sinceMs = sinceDate.getTime();
    let client: TelegramClient;
    try {
      client = await this.connect();
    } catch (err) {
      // A connection/auth failure degrades this source (the funnel marks the run
      // partial) rather than crashing it.
      logger.error({ err: String(err), channel: handle }, "[sourcing] telegram connect failed");
      throw err;
    }

    let count = 0;
    // iterMessages yields newest-first; we stop once we cross the age cutoff.
    for await (const msg of client.iterMessages(handle, { limit: this.cfg.perChannelLimit })) {
      if (count >= this.cfg.perChannelLimit) break;
      const dateSec = typeof msg.date === "number" ? msg.date : null;
      if (dateSec === null) continue;
      const postedMs = dateSec * 1000;
      if (postedMs < sinceMs) break; // newest-first ⇒ everything after is older
      const text = typeof msg.message === "string" ? msg.message : "";
      if (text.trim().length === 0) continue; // skip media-only / service posts

      const candidate = {
        channel: handle,
        message_id: msg.id,
        posted_at: new Date(postedMs).toISOString(),
        text,
        url: `https://t.me/${handle}/${msg.id}`,
      };
      const parsed = RawMessageSchema.safeParse(candidate);
      if (!parsed.success) {
        logger.warn({ channel: handle, id: msg.id }, "[sourcing] telegram message failed envelope");
        continue;
      }
      count += 1;
      yield parsed.data;
    }
  }
}
