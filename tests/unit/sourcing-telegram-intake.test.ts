import { describe, it, expect, vi } from "vitest";
import {
  parseGetUpdates,
  attributePosts,
  runTelegramIngest,
  type IntakeChannel,
  type IngestPostRow,
  type TelegramIngestDeps,
} from "@/lib/sourcing/connectors/telegram/ingest";
import { DbTelegramReader, type TelegramPostRow } from "@/lib/sourcing/connectors/telegram/db-reader";
import { createTelegramConnector } from "@/lib/sourcing/connectors/telegram/connector";
import type { TelegramExtraction } from "@/lib/sourcing/connectors/telegram/schema";
import type { RequirementProfile, FetchBudget } from "@/lib/sourcing/types";

const NOW = Date.parse("2026-06-03T12:00:00Z");
const BUDGET: FetchBudget = { maxFetched: 100, maxProCalls: 50, tokenCeiling: 5_000_000 };
// A fresh post (~4 days old) in unix seconds, well inside the 90-day window.
const FRESH = Math.floor(Date.parse("2026-05-30T10:00:00Z") / 1000);

function profile(): RequirementProfile {
  return {
    hard_requirements: [],
    title: "Driver",
    location: null,
    required_skills: [],
    must_haves: [],
    nice_to_haves: [],
    seniority: null,
    required_languages: [],
    search_keywords: [],
  };
}

function extraction(over: Partial<TelegramExtraction> = {}): TelegramExtraction {
  return {
    classification: "candidate_cv",
    confidence: 0.9,
    actively_looking: true,
    fields: [{ field: "headline", value: "Driver", evidence: "водителем" }],
    ...over,
  };
}

/** Build a getUpdates payload with one channel_post per spec. */
function getUpdates(
  updates: Array<{
    update_id: number;
    chat_id: number;
    username?: string | null;
    title?: string | null;
    message_id: number;
    date: number;
    text?: string | null;
    edited?: boolean;
  }>,
) {
  return {
    ok: true,
    result: updates.map((u) => {
      const post = {
        message_id: u.message_id,
        date: u.date,
        chat: { id: u.chat_id, username: u.username ?? null, title: u.title ?? null, type: "channel" },
        text: u.text ?? null,
      };
      return u.edited
        ? { update_id: u.update_id, edited_channel_post: post }
        : { update_id: u.update_id, channel_post: post };
    }),
  };
}

// ===================================================================
// parseGetUpdates
// ===================================================================

describe("ingest — parseGetUpdates", () => {
  it("lifts channel posts, converts the date, lowercases the username, tracks max id", () => {
    const { maxUpdateId, posts } = parseGetUpdates(
      getUpdates([
        { update_id: 10, chat_id: -100, username: "Acme_CV", message_id: 5, date: FRESH, text: "Ищу работу @ivan" },
        { update_id: 12, chat_id: -100, username: "Acme_CV", message_id: 6, date: FRESH, text: "edited", edited: true },
      ]),
    );
    expect(maxUpdateId).toBe(12);
    expect(posts).toHaveLength(2);
    expect(posts[0].username).toBe("acme_cv");
    expect(posts[0].postedAt).toBe(new Date(FRESH * 1000).toISOString());
    expect(posts[1].messageId).toBe(6); // edited_channel_post is read too
  });

  it("skips updates without a channel post or with empty text, but still advances max id", () => {
    const { maxUpdateId, posts } = parseGetUpdates({
      ok: true,
      result: [
        { update_id: 1, channel_post: { message_id: 1, date: FRESH, chat: { id: -1 }, text: "   " } },
        { update_id: 2 }, // e.g. a my_chat_member update — no post
      ],
    });
    expect(maxUpdateId).toBe(2);
    expect(posts).toHaveLength(0);
  });

  it("throws when the envelope reports not-ok", () => {
    expect(() => parseGetUpdates({ ok: false, result: [] })).toThrow();
  });

  it("throws on a malformed envelope (loud, never silent)", () => {
    expect(() => parseGetUpdates({ nope: true })).toThrow();
  });
});

// ===================================================================
// attributePosts
// ===================================================================

const channels: IntakeChannel[] = [
  { companyId: "co-a", handle: "acme_cv", chatId: -100 },
  { companyId: "co-b", handle: "beta_jobs", chatId: null },
];

function parse(
  updates: Parameters<typeof getUpdates>[0],
  maxAge = 90,
): ReturnType<typeof attributePosts> {
  const { posts } = parseGetUpdates(getUpdates(updates));
  return attributePosts(posts, channels, NOW, maxAge);
}

describe("ingest — attributePosts", () => {
  it("attributes by numeric chat id and marks a CV-with-contact for AI", () => {
    const { planned } = parse([
      { update_id: 1, chat_id: -100, username: "acme_cv", message_id: 1, date: FRESH, text: "Ищу работу водителем, опыт 5 лет @ivan_driver" },
    ]);
    expect(planned).toHaveLength(1);
    expect(planned[0].companyId).toBe("co-a");
    expect(planned[0].needsAi).toBe(true);
    expect(planned[0].contactKey).toBe("tg:@ivan_driver");
    expect(planned[0].url).toBe("https://t.me/acme_cv/1");
  });

  it("attributes a chatId-less channel by username and learns its chat id", () => {
    const { planned, learned } = parse([
      { update_id: 1, chat_id: -555, username: "beta_jobs", title: "Beta Jobs", message_id: 2, date: FRESH, text: "Ищу работу поваром @chef_b" },
    ]);
    expect(planned[0].companyId).toBe("co-b");
    expect(learned).toEqual([{ handle: "beta_jobs", chatId: -555, title: "Beta Jobs" }]);
  });

  it("ignores posts from channels nobody registered (tenant boundary)", () => {
    const { planned } = parse([
      { update_id: 1, chat_id: -999, username: "random_channel", message_id: 1, date: FRESH, text: "Ищу работу @x" },
    ]);
    expect(planned).toHaveLength(0);
  });

  it("drops too-old posts before they reach storage", () => {
    const old = Math.floor(Date.parse("2026-01-01T00:00:00Z") / 1000); // ~5 months
    const { planned } = parse([
      { update_id: 1, chat_id: -100, username: "acme_cv", message_id: 1, date: old, text: "Ищу работу @ivan_driver" },
    ]);
    expect(planned).toHaveLength(0);
  });

  it("stores closed-signal and contactless posts as cheap noise (no AI)", () => {
    const { planned } = parse([
      { update_id: 1, chat_id: -100, username: "acme_cv", message_id: 1, date: FRESH, text: "Спасибо, уже нашёл работу!" },
      { update_id: 2, chat_id: -100, username: "acme_cv", message_id: 2, date: FRESH, text: "Просто пост без контактов и смысла" },
    ]);
    expect(planned).toHaveLength(2);
    expect(planned.every((p) => p.needsAi === false)).toBe(true);
    expect(planned.every((p) => p.contactKey === null)).toBe(true);
  });
});

// ===================================================================
// runTelegramIngest (DI orchestration)
// ===================================================================

function ingestDeps(over: Partial<TelegramIngestDeps> = {}): {
  deps: TelegramIngestDeps;
  upserted: IngestPostRow[];
  savedOffset: { value: number | null };
  classifySpy: ReturnType<typeof vi.fn>;
} {
  const upserted: IngestPostRow[] = [];
  const savedOffset = { value: null as number | null };
  const classifySpy = vi.fn(async () => extraction());
  const deps: TelegramIngestDeps = {
    maxAgeDays: 90,
    now: () => NOW,
    loadChannels: async () => channels,
    loadOffset: async () => 0,
    saveOffset: async (id) => {
      savedOffset.value = id;
    },
    classify: classifySpy as unknown as TelegramIngestDeps["classify"],
    upsertPosts: async (rows) => {
      upserted.push(...rows);
    },
    learnChatId: async () => {},
    fetchUpdates: async () =>
      getUpdates([
        { update_id: 7, chat_id: -100, username: "acme_cv", message_id: 1, date: FRESH, text: "Ищу работу водителем @ivan_driver" },
        { update_id: 8, chat_id: -100, username: "acme_cv", message_id: 2, date: FRESH, text: "уже нашёл работу, спасибо" },
      ]),
    ...over,
  };
  return { deps, upserted, savedOffset, classifySpy };
}

describe("ingest — runTelegramIngest", () => {
  it("classifies CV posts, stores closers as noise, and advances the offset", async () => {
    const { deps, upserted, savedOffset, classifySpy } = ingestDeps();
    const summary = await runTelegramIngest(deps);

    expect(classifySpy).toHaveBeenCalledTimes(1); // only the CV post, not the closer
    expect(summary).toMatchObject({ attributed: 2, classified: 1, stored: 2 });
    expect(savedOffset.value).toBe(8);

    const cv = upserted.find((r) => r.message_id === 1)!;
    expect(cv.classification).toBe("candidate_cv");
    expect(cv.extraction).not.toBeNull();
    expect(cv.contact_key).toBe("tg:@ivan_driver");
    const closer = upserted.find((r) => r.message_id === 2)!;
    expect(closer.classification).toBe("other");
    expect(closer.extraction).toBeNull();
  });

  it("does nothing (and never polls) when no channels are registered", async () => {
    const fetchSpy = vi.fn(async () => getUpdates([]));
    const { deps } = ingestDeps({ loadChannels: async () => [], fetchUpdates: fetchSpy });
    const summary = await runTelegramIngest(deps);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(summary.stored).toBe(0);
  });

  it("stores a classify failure as noise and keeps going (fail-closed)", async () => {
    const { deps, upserted } = ingestDeps({
      classify: (async () => {
        throw new Error("gemini down");
      }) as unknown as TelegramIngestDeps["classify"],
    });
    await runTelegramIngest(deps);
    const cv = upserted.find((r) => r.message_id === 1)!;
    expect(cv.classification).toBe("other"); // dropped to noise, not crashed
  });
});

// ===================================================================
// DbTelegramReader
// ===================================================================

function postRow(over: Partial<TelegramPostRow> = {}): TelegramPostRow {
  return {
    channel: "acme_cv",
    message_id: over.message_id ?? 1,
    posted_at: over.posted_at ?? "2026-05-30T10:00:00Z",
    text: over.text ?? "Ищу работу водителем @ivan_driver",
    url: over.url ?? "https://t.me/acme_cv/1",
    classification: over.classification ?? "candidate_cv",
    confidence: over.confidence ?? 0.9,
    extraction: over.extraction ?? extraction(),
  };
}

describe("DbTelegramReader", () => {
  it("yields candidate_cv rows carrying the cached extraction", async () => {
    const reader = new DbTelegramReader(async () => [postRow()], 200);
    const out = [];
    for await (const m of reader.listMessages("acme_cv", new Date(0))) out.push(m);
    expect(out).toHaveLength(1);
    expect(out[0].cachedExtraction).toEqual(extraction());
    expect(out[0].message_id).toBe(1);
  });

  it("drops a row whose cached extraction no longer parses (fail-closed)", async () => {
    const reader = new DbTelegramReader(async () => [postRow({ extraction: { bogus: true } })], 200);
    const out = [];
    for await (const m of reader.listMessages("acme_cv", new Date(0))) out.push(m);
    expect(out).toHaveLength(0);
  });

  it("never surfaces a non-candidate_cv row even if the query widened", async () => {
    const reader = new DbTelegramReader(
      async () => [postRow({ classification: "vacancy", extraction: extraction({ classification: "vacancy" }) })],
      200,
    );
    const out = [];
    for await (const m of reader.listMessages("acme_cv", new Date(0))) out.push(m);
    expect(out).toHaveLength(0);
  });
});

// ===================================================================
// Connector over the DB reader — the cost win: no Gemini at search time.
// ===================================================================

describe("connector — cached-extraction (DB) path", () => {
  it("emits a normalized candidate WITHOUT calling the live classifier", async () => {
    const classifySpy = vi.fn(async () => extraction());
    const reader = new DbTelegramReader(async () => [postRow()], 200);
    const connector = createTelegramConnector({
      reader,
      classify: classifySpy,
      isConfigured: () => true,
      channels: ["acme_cv"],
      maxAgeDays: 90,
      perChannelLimit: 200,
      now: () => NOW,
    });

    const out = [];
    for await (const p of connector.fetch(profile(), BUDGET)) out.push(p);

    expect(classifySpy).not.toHaveBeenCalled(); // classification was cached at ingest
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("telegram");
    expect(out[0].source_ref).toBe("telegram:acme_cv:1");
    expect(out[0].contact.telegram).toBe("@ivan_driver");
  });

  it("drops a cached vacancy — a recruiter post is never surfaced as a candidate", async () => {
    // Reader-level guard already filters, but assert end-to-end the connector
    // yields nothing for a vacancy that somehow slipped to candidate-shaped data.
    const reader = new DbTelegramReader(
      async () => [postRow({ classification: "vacancy", extraction: extraction({ classification: "vacancy" }) })],
      200,
    );
    const connector = createTelegramConnector({
      reader,
      classify: vi.fn(async () => extraction()),
      isConfigured: () => true,
      channels: ["acme_cv"],
      maxAgeDays: 90,
      perChannelLimit: 200,
      now: () => NOW,
    });
    const out = [];
    for await (const p of connector.fetch(profile(), BUDGET)) out.push(p);
    expect(out).toHaveLength(0);
  });
});
