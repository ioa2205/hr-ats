import { describe, it, expect, vi } from "vitest";
import {
  ageInDays,
  collapseReposts,
  detectIntent,
  findActivePhrase,
  isClosedSignal,
  parsePostedAt,
  withinAgeWindow,
} from "@/lib/sourcing/connectors/telegram/recency";
import { extractContact, prefilter } from "@/lib/sourcing/connectors/telegram/classify";
import { normalizeTelegramMessage } from "@/lib/sourcing/connectors/telegram/normalize";
import { createTelegramConnector } from "@/lib/sourcing/connectors/telegram/connector";
import { parseChannels } from "@/lib/sourcing/connectors/telegram/index";
import { RawMessageSchema, type RawMessage, type TelegramExtraction } from "@/lib/sourcing/connectors/telegram/schema";
import type { TelegramReader } from "@/lib/sourcing/connectors/telegram/reader";
import type { RequirementProfile, FetchBudget } from "@/lib/sourcing/types";

const NOW = Date.parse("2026-06-03T12:00:00Z");
const BUDGET: FetchBudget = { maxFetched: 100, maxProCalls: 50, tokenCeiling: 5_000_000 };

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

function msg(over: Partial<RawMessage> = {}): RawMessage {
  return RawMessageSchema.parse({
    channel: "ish_uz",
    message_id: over.message_id ?? 1,
    posted_at: over.posted_at ?? "2026-05-30T10:00:00Z",
    text: over.text ?? "Ищу работу водителем. Опыт 5 лет. @ivan_driver",
    url: over.url ?? null,
    ...over,
  });
}

/** A reader that yields canned messages per channel, newest-first per the API. */
function fakeReader(byChannel: Record<string, RawMessage[]>): TelegramReader {
  return {
    async *listMessages(channel) {
      for (const m of byChannel[channel] ?? []) yield m;
    },
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

// ===================================================================
// recency.ts
// ===================================================================

describe("recency — age cutoff", () => {
  it("keeps a fresh post and drops one past the window", () => {
    expect(withinAgeWindow("2026-05-30T10:00:00Z", 45, NOW)).toBe(true); // ~4 days
    expect(withinAgeWindow("2024-01-01T00:00:00Z", 45, NOW)).toBe(false); // ~2 years
  });

  it("treats an unparseable date as out of window (fail-closed)", () => {
    expect(withinAgeWindow("not-a-date", 45, NOW)).toBe(false);
    expect(parsePostedAt("not-a-date")).toBeNull();
    expect(ageInDays("not-a-date", NOW)).toBeNull();
  });

  it("keeps a future-dated post (clock skew is not staleness)", () => {
    expect(withinAgeWindow("2026-07-01T00:00:00Z", 45, NOW)).toBe(true);
  });

  it("respects the exact boundary", () => {
    const exactly45 = new Date(NOW - 45 * 86_400_000).toISOString();
    expect(withinAgeWindow(exactly45, 45, NOW)).toBe(true);
    const justOver = new Date(NOW - 46 * 86_400_000).toISOString();
    expect(withinAgeWindow(justOver, 45, NOW)).toBe(false);
  });
});

describe("recency — active / closed intent (ru/uz/en)", () => {
  it("flags active-intent phrases", () => {
    expect(detectIntent("Срочно ищу работу").active).toBe(true);
    expect(detectIntent("Ish qidiryapman, tajriba bor").active).toBe(true);
    expect(detectIntent("Open to work as a backend dev").active).toBe(true);
    expect(detectIntent("Просто болтаю о погоде").active).toBe(false);
  });

  it("flags closed/done phrases and drops them", () => {
    expect(isClosedSignal("Спасибо всем, уже нашёл работу")).toBe(true);
    expect(isClosedSignal("Вакансия закрыта")).toBe(true);
    expect(isClosedSignal("Ish topdim, rahmat")).toBe(true);
    expect(isClosedSignal("found a job, thanks")).toBe(true);
    expect(isClosedSignal("Ищу работу водителем")).toBe(false);
  });

  it("returns the verbatim active phrase for provenance", () => {
    expect(findActivePhrase("Здравствуйте! Ищу работу водителем")).toBe("Ищу работу");
    expect(findActivePhrase("nothing here")).toBeNull();
  });
});

describe("recency — repost collapse / latest-wins", () => {
  it("keeps only the newest message per contact, preserving first-seen order", () => {
    const items = [
      { key: "a", at: "2026-05-01T00:00:00Z", id: "a-old" },
      { key: "b", at: "2026-05-10T00:00:00Z", id: "b-only" },
      { key: "a", at: "2026-05-20T00:00:00Z", id: "a-new" },
    ];
    const out = collapseReposts(items, (i) => i.key, (i) => i.at);
    expect(out.map((i) => i.id)).toEqual(["a-new", "b-only"]);
  });

  it("a dated repost beats an undated one", () => {
    const items = [
      { key: "a", at: "bad-date", id: "undated" },
      { key: "a", at: "2026-05-20T00:00:00Z", id: "dated" },
    ];
    const out = collapseReposts(items, (i) => i.key, (i) => i.at);
    expect(out.map((i) => i.id)).toEqual(["dated"]);
  });
});

// ===================================================================
// classify.ts — contact extraction + pre-filter
// ===================================================================

describe("classify — contact extraction", () => {
  it("captures an @username and builds its t.me url", () => {
    const c = extractContact("Ищу работу @ivan_driver звоните");
    expect(c?.username).toBe("@ivan_driver");
    expect(c?.key).toBe("tg:@ivan_driver");
    expect(c?.profile_url).toBe("https://t.me/ivan_driver");
  });

  it("captures a t.me link", () => {
    expect(extractContact("пишите https://t.me/anna_hr")?.username).toBe("@anna_hr");
  });

  it("captures a phone when no handle is present", () => {
    const c = extractContact("Резюме. Тел: +998 90 123 45 67");
    expect(c?.username).toBeNull();
    expect(c?.phone).toBe("998901234567");
    expect(c?.key).toBe("tel:998901234567");
  });

  it("does NOT mistake an email domain for a telegram handle", () => {
    const c = extractContact("CV: ivan@gmail.com, опыт 3 года");
    expect(c?.username).toBeNull();
    expect(c?.email).toBe("ivan@gmail.com");
    expect(c?.key).toBe("eml:ivan@gmail.com");
  });

  it("returns null when there is no contact at all", () => {
    expect(extractContact("Ищу работу, опыт большой")).toBeNull();
  });
});

describe("classify — pre-filter", () => {
  it("keeps a plausible CV with a handle and role signal", () => {
    const r = prefilter("Ищу работу водителем, опыт 5 лет @ivan_driver");
    expect(r.keep).toBe(true);
    expect(r.contact?.key).toBe("tg:@ivan_driver");
  });

  it("drops a message with no contact handle (unpromotable)", () => {
    const r = prefilter("Ищу работу водителем, опыт 5 лет");
    expect(r.keep).toBe(false);
    expect(r.reason).toBe("no_contact");
  });

  it("drops an obvious ad with no job-seeking signal", () => {
    const r = prefilter("🔥 Скидка на курс! Запишись @best_courses_bot реклама");
    expect(r.keep).toBe(false);
    expect(r.reason).toBe("ad");
  });

  it("drops a contact-only message with no role/skill signal", () => {
    const r = prefilter("Всем привет, отличный день! @some_user пишите");
    expect(r.keep).toBe(false);
    expect(r.reason).toBe("no_role_signal");
  });
});

// ===================================================================
// normalize.ts — provenance discipline
// ===================================================================

describe("normalizeTelegramMessage", () => {
  it("emits provenance-tagged fields, captures contact, fabricates nothing", () => {
    const message = msg({
      text: "Ищу работу водителем. Опыт 5 лет, категория B. @ivan_driver",
      posted_at: "2026-05-30T10:00:00Z",
      message_id: 42,
    });
    const contact = extractContact(message.text)!;
    const ex = extraction({
      fields: [
        { field: "name", value: "Иван", evidence: "Иван" },
        { field: "headline", value: "Водитель", evidence: "водителем" },
        { field: "skill", value: "категория B", evidence: "категория B" },
      ],
    });
    const rec = normalizeTelegramMessage(message, ex, contact, NOW);

    expect(rec.source).toBe("telegram");
    expect(rec.source_ref).toBe("telegram:ish_uz:42");
    expect(rec.profile.full_name).toBe("Иван");
    expect(rec.profile.headline).toBe("Водитель");
    // Every extracted field carries a verbatim evidence span.
    for (const f of rec.profile.fields) {
      expect(f.evidence.trim().length).toBeGreaterThan(0);
    }
    const skill = rec.profile.fields.find((f) => f.field === "skill");
    expect(skill?.evidence).toBe("категория B");
    // Contact is promotable: handle + url captured.
    expect(rec.contact.telegram).toBe("@ivan_driver");
    expect(rec.contact.profile_url).toBe("https://t.me/ivan_driver");
    // actively_looking only when quotable; posted_at exposed for ranking.
    expect(rec.profile.fields.find((f) => f.field === "actively_looking")?.evidence).toBe("Ищу работу");
    expect(rec.profile.fields.find((f) => f.field === "posted_at")?.value).toBe("2026-05-30T10:00:00Z");
    // The verbatim post is in raw_text for the gate to quote.
    expect(rec.profile.raw_text).toContain("Ищу работу водителем");
  });

  it("falls back to the handle when no name is extracted, drops empty-evidence fields", () => {
    const message = msg({ text: "open to work, react dev @react_dev_99", message_id: 7 });
    const contact = extractContact(message.text)!;
    const ex = extraction({
      actively_looking: true,
      fields: [
        { field: "skill", value: "React", evidence: "react" },
        { field: "headline", value: "guessed", evidence: "" }, // no evidence ⇒ dropped
      ],
    });
    const rec = normalizeTelegramMessage(message, ex, contact, NOW);
    expect(rec.profile.full_name).toBe("@react_dev_99");
    expect(rec.profile.fields.some((f) => f.value === "guessed")).toBe(false);
  });
});

// ===================================================================
// connector.ts — orchestration with injected fakes (zero network)
// ===================================================================

describe("createTelegramConnector.fetch", () => {
  function collect(connector: ReturnType<typeof createTelegramConnector>, budget = BUDGET) {
    return (async () => {
      const out = [];
      for await (const r of connector.fetch(profile(), budget)) out.push(r);
      return out;
    })();
  }

  const baseDeps = {
    classify: vi.fn(async () => extraction()),
    isConfigured: () => true,
    channels: ["ish_uz"],
    maxAgeDays: 45,
    perChannelLimit: 200,
    now: () => NOW,
  };

  it("yields nothing when the reader is null (unconfigured)", async () => {
    const connector = createTelegramConnector({ ...baseDeps, reader: null });
    expect(await collect(connector)).toHaveLength(0);
  });

  it("yields nothing when isConfigured is false", async () => {
    const classify = vi.fn(async () => extraction());
    const connector = createTelegramConnector({
      ...baseDeps,
      classify,
      isConfigured: () => false,
      reader: fakeReader({ ish_uz: [msg()] }),
    });
    expect(await collect(connector)).toHaveLength(0);
    expect(classify).not.toHaveBeenCalled();
  });

  it("yields nothing when the allow-list is empty", async () => {
    const connector = createTelegramConnector({
      ...baseDeps,
      channels: [],
      reader: fakeReader({ ish_uz: [msg()] }),
    });
    expect(await collect(connector)).toHaveLength(0);
  });

  it("normalizes a candidate_cv from an allow-listed channel", async () => {
    const connector = createTelegramConnector({
      ...baseDeps,
      reader: fakeReader({ ish_uz: [msg({ text: "Ищу работу водителем @ivan_driver", message_id: 5 })] }),
    });
    const out = await collect(connector);
    expect(out).toHaveLength(1);
    expect(out[0].source_ref).toBe("telegram:ish_uz:5");
  });

  it("drops a recruiter vacancy (never surfaced as a candidate)", async () => {
    // Real-shaped vacancy text; the AI classifies it `vacancy`.
    const vacancyText = "🚖 В транспортную компанию ТРЕБУЕТСЯ водитель категории B. Зарплата от 5 млн. Звоните @hr_logistics";
    const connector = createTelegramConnector({
      ...baseDeps,
      classify: vi.fn(async () => extraction({ classification: "vacancy" })),
      reader: fakeReader({ ish_uz: [msg({ text: vacancyText, message_id: 9 })] }),
    });
    expect(await collect(connector)).toHaveLength(0);
  });

  it("drops ad / other / low-confidence classifications", async () => {
    const classify = vi
      .fn<(t: string) => Promise<TelegramExtraction>>()
      .mockResolvedValueOnce(extraction({ classification: "ad" }))
      .mockResolvedValueOnce(extraction({ classification: "other" }))
      .mockResolvedValueOnce(extraction({ confidence: 0.2 }));
    const connector = createTelegramConnector({
      ...baseDeps,
      classify,
      reader: fakeReader({
        ish_uz: [
          msg({ text: "Ищу работу A @user_aaaa", message_id: 1 }),
          msg({ text: "Ищу работу B @user_bbbb", message_id: 2 }),
          msg({ text: "Ищу работу C @user_cccc", message_id: 3 }),
        ],
      }),
    });
    expect(await collect(connector)).toHaveLength(0);
  });

  it("drops stale and closed-signal posts before the AI step", async () => {
    const classify = vi.fn(async () => extraction());
    const connector = createTelegramConnector({
      ...baseDeps,
      classify,
      reader: fakeReader({
        ish_uz: [
          msg({ text: "Ищу работу @old_guy_99", posted_at: "2024-01-01T00:00:00Z", message_id: 1 }),
          msg({ text: "Спасибо, уже нашёл работу @done_guy_99", posted_at: "2026-06-01T00:00:00Z", message_id: 2 }),
        ],
      }),
    });
    expect(await collect(connector)).toHaveLength(0);
    expect(classify).not.toHaveBeenCalled();
  });

  it("collapses reposts across channels by contact, keeping the newest", async () => {
    const connector = createTelegramConnector({
      ...baseDeps,
      channels: ["ish_uz", "hh_jobs"],
      reader: fakeReader({
        ish_uz: [msg({ text: "Ищу работу водителем @ivan_driver", posted_at: "2026-05-01T00:00:00Z", message_id: 1 })],
        hh_jobs: [msg({ channel: "hh_jobs", text: "Снова ищу работу водителем @ivan_driver", posted_at: "2026-05-28T00:00:00Z", message_id: 8 })],
      }),
    });
    const out = await collect(connector);
    expect(out).toHaveLength(1);
    // The newer repost (hh_jobs) wins.
    expect(out[0].source_ref).toBe("telegram:hh_jobs:8");
  });

  it("suppresses contacts already known to the company", async () => {
    const connector = createTelegramConnector({
      ...baseDeps,
      isKnownContact: (key) => key === "tg:@ivan_driver",
      reader: fakeReader({
        ish_uz: [
          msg({ text: "Ищу работу водителем @ivan_driver", message_id: 1 }),
          msg({ text: "Ищу работу водителем @petr_driver", message_id: 2 }),
        ],
      }),
    });
    const out = await collect(connector);
    expect(out.map((r) => r.contact.telegram)).toEqual(["@petr_driver"]);
  });

  it("respects budget.maxFetched (caps how many reach the paid AI step)", async () => {
    const classify = vi.fn(async () => extraction());
    const messages = Array.from({ length: 10 }, (_, i) =>
      msg({ text: `Ищу работу @seeker_${1000 + i}`, message_id: i + 1 }),
    );
    const connector = createTelegramConnector({
      ...baseDeps,
      classify,
      reader: fakeReader({ ish_uz: messages }),
    });
    const out = await collect(connector, { ...BUDGET, maxFetched: 3 });
    expect(out).toHaveLength(3);
    expect(classify).toHaveBeenCalledTimes(3);
  });

  it("degrades only when EVERY channel read fails", async () => {
    const boom: TelegramReader = {
      async *listMessages() {
        throw new Error("channel gone");
      },
    };
    const connector = createTelegramConnector({ ...baseDeps, channels: ["a_chan", "b_chan"], reader: boom });
    await expect(collect(connector)).rejects.toThrow("channel gone");
  });
});

// ===================================================================
// index.ts — channel allow-list parsing
// ===================================================================

describe("parseChannels", () => {
  it("splits, trims, strips '@', lowercases and de-duplicates", () => {
    expect(parseChannels(" @Ish_UZ, hh_jobs ,@ish_uz,, ")).toEqual(["ish_uz", "hh_jobs"]);
  });
  it("returns [] for undefined", () => {
    expect(parseChannels(undefined)).toEqual([]);
  });
});
