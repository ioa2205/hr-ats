import { describe, it, expect, vi } from "vitest";
import { HhResumeSearchSchema, HhResumeItemSchema } from "@/lib/sourcing/connectors/hh/schema";
import { normalizeHhResume } from "@/lib/sourcing/connectors/hh/normalize";
import { buildQueryText, joinKeywords, createHhConnector } from "@/lib/sourcing/connectors/hh/connector";
import { hhAreaName, HH_UZBEKISTAN_AREA_ID } from "@/lib/sourcing/connectors/hh/areas";
import { HhClient, HhAuthError, HhRequestError } from "@/lib/sourcing/connectors/hh/client";
import type { HhResumeSearch } from "@/lib/sourcing/connectors/hh/schema";
import type { RequirementProfile, FetchBudget } from "@/lib/sourcing/types";

const BUDGET: FetchBudget = { maxFetched: 100, maxProCalls: 50, tokenCeiling: 5_000_000 };

function profile(over: Partial<RequirementProfile> = {}): RequirementProfile {
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
    ...over,
  };
}

describe("HhResumeSearchSchema (tolerant items, strict envelope)", () => {
  it("parses a realistic response and ignores unknown fields", () => {
    const raw = {
      found: 2,
      pages: 1,
      page: 0,
      per_page: 50,
      unexpected_top_level: "ignored",
      items: [
        {
          id: "abc",
          title: "Водитель",
          area: { id: "2759", name: "Ташкент" },
          skill_set: ["B category"],
          some_new_field: true,
        },
      ],
    };
    const parsed = HhResumeSearchSchema.parse(raw);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].id).toBe("abc");
    expect(parsed.found).toBe(2);
  });

  it("rejects a broken envelope (items not an array) — fails loud, never silent-empty", () => {
    expect(HhResumeSearchSchema.safeParse({ items: "nope" }).success).toBe(false);
  });

  it("requires an id on each item", () => {
    expect(HhResumeItemSchema.safeParse({ title: "no id" }).success).toBe(false);
  });
});

describe("normalizeHhResume — provenance discipline", () => {
  it("maps a full resume to a provenance-tagged profile, contacts withheld", () => {
    const rec = normalizeHhResume({
      id: "r1",
      first_name: "Иван",
      last_name: "Петров",
      title: "Старший водитель",
      area: { id: "2759", name: "Ташкент" },
      total_experience: { months: 48 },
      experience: [{ company: "Logistics LLC", position: "Driver", description: "Delivered cargo" }],
      skill_set: ["B category", "C category"],
      language: [{ name: "Русский", level: { id: "l1", name: "Родной" } }],
      alternate_url: "https://hh.uz/resume/r1",
    });

    expect(rec.source).toBe("hh");
    expect(rec.source_ref).toBe("hh:r1");
    expect(rec.profile.full_name).toBe("Иван Петров");
    expect(rec.profile.location).toBe("Ташкент");
    // Every field carries verbatim evidence; nothing synthesized.
    const skill = rec.profile.fields.find((f) => f.field === "skill" && f.value === "B category");
    expect(skill?.evidence).toBe("B category");
    const exp = rec.profile.fields.find((f) => f.field === "experience");
    expect(exp?.evidence).toContain("Driver @ Logistics LLC");
    expect(rec.profile.raw_text).toContain("Languages:");
    expect(rec.profile.raw_text).toContain("Ташкент");
    // Contacts are not exposed by search results.
    expect(rec.contact.phone).toBeNull();
    expect(rec.contact.profile_url).toBe("https://hh.uz/resume/r1");
  });

  it("falls back to the title (then a stable id) when hh hides the name", () => {
    expect(normalizeHhResume({ id: "r2", title: "Бухгалтер" }).profile.full_name).toBe("Бухгалтер");
    expect(normalizeHhResume({ id: "r3" }).profile.full_name).toBe("hh resume r3");
  });

  it("emits no fabricated fields for an empty resume", () => {
    const rec = normalizeHhResume({ id: "r4" });
    expect(rec.profile.fields).toEqual([]);
    expect(rec.contact.profile_url).toBeNull();
  });
});

describe("buildQueryText", () => {
  it("OR-joins search keywords, de-duplicated case-insensitively (broad recall)", () => {
    expect(
      buildQueryText(profile({ search_keywords: ["driver", "Driver", "logistics"] })),
    ).toBe("driver OR logistics");
  });

  it("quotes multi-word phrases so hh treats them as one term, not AND-of-words", () => {
    expect(
      buildQueryText(
        profile({ search_keywords: ["системный администратор", "сисадмин", "system administrator"] }),
      ),
    ).toBe('"системный администратор" OR сисадмин OR "system administrator"');
  });

  it("falls back to title + required skills (OR-joined) when no keywords", () => {
    expect(buildQueryText(profile({ title: "Driver", required_skills: ["B category"] }))).toBe(
      'Driver OR "B category"',
    );
  });
});

describe("joinKeywords (user keyword override → hh text)", () => {
  it("trims, de-duplicates case-insensitively, and OR-joins (quoting phrases)", () => {
    expect(joinKeywords(["React", "react", " frontend ", ""])).toBe("React OR frontend");
  });

  it("returns an empty string for an all-blank list", () => {
    expect(joinKeywords(["", "   "])).toBe("");
  });
});

describe("hh region catalog", () => {
  it("resolves a curated area id to its hh name", () => {
    expect(hhAreaName("2759")).toBe("Ташкент");
    expect(hhAreaName(HH_UZBEKISTAN_AREA_ID)).toBe("Узбекистан");
  });

  it("returns null for all-regions (null/undefined) and unknown ids", () => {
    expect(hhAreaName(null)).toBeNull();
    expect(hhAreaName(undefined)).toBeNull();
    expect(hhAreaName("99999")).toBeNull();
  });
});

describe("createHhConnector.fetch — pagination + budget", () => {
  function pageOf(ids: string[], pages: number): HhResumeSearch {
    return { items: ids.map((id) => ({ id })), pages, page: 0, per_page: 2, found: pages * 2 };
  }

  it("yields nothing when unconfigured (never calls search)", async () => {
    const search = vi.fn();
    const connector = createHhConnector({ search, isConfigured: () => false });
    const out = [];
    for await (const r of connector.fetch(profile(), BUDGET)) out.push(r);
    expect(out).toHaveLength(0);
    expect(search).not.toHaveBeenCalled();
  });

  it("paginates until hh's reported page count, normalizing each hit", async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce(pageOf(["a", "b"], 2))
      .mockResolvedValueOnce(pageOf(["c", "d"], 2));
    const connector = createHhConnector({ search, isConfigured: () => true, perPage: 2 });
    const out = [];
    for await (const r of connector.fetch(profile(), BUDGET)) out.push(r);
    expect(out.map((r) => r.source_ref)).toEqual(["hh:a", "hh:b", "hh:c", "hh:d"]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("stops at budget.maxFetched even if more pages exist", async () => {
    const search = vi.fn().mockResolvedValue(pageOf(["a", "b"], 999));
    const connector = createHhConnector({ search, isConfigured: () => true, perPage: 2 });
    const out = [];
    for await (const r of connector.fetch(profile(), { ...BUDGET, maxFetched: 3 })) out.push(r);
    expect(out).toHaveLength(3);
  });

  it("stops on a short final page", async () => {
    const search = vi.fn().mockResolvedValueOnce(pageOf(["a"], 0));
    const connector = createHhConnector({ search, isConfigured: () => true, perPage: 2 });
    const out = [];
    for await (const r of connector.fetch(profile(), BUDGET)) out.push(r);
    expect(out).toHaveLength(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("queries the user's textOverride verbatim, ignoring profile keywords", async () => {
    const search = vi.fn().mockResolvedValueOnce(pageOf(["a"], 0));
    const connector = createHhConnector({
      search,
      isConfigured: () => true,
      perPage: 2,
      textOverride: "react frontend",
    });
    const out = [];
    for await (const r of connector.fetch(profile({ search_keywords: ["driver"] }), BUDGET)) {
      out.push(r);
    }
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ text: "react frontend" }));
  });

  it("falls back to the profile query when textOverride is blank", async () => {
    const search = vi.fn().mockResolvedValueOnce(pageOf(["a"], 0));
    const connector = createHhConnector({
      search,
      isConfigured: () => true,
      perPage: 2,
      textOverride: "   ",
    });
    const out = [];
    for await (const r of connector.fetch(profile({ search_keywords: ["driver"] }), BUDGET)) {
      out.push(r);
    }
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ text: "driver" }));
  });

  it("OR-joins multiple profile keywords into the hh query (broad recall)", async () => {
    const search = vi.fn().mockResolvedValueOnce(pageOf(["a"], 0));
    const connector = createHhConnector({ search, isConfigured: () => true, perPage: 2 });
    const out = [];
    for await (const r of connector.fetch(
      profile({ search_keywords: ["сисадмин", "system administrator"] }),
      BUDGET,
    )) {
      out.push(r);
    }
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'сисадмин OR "system administrator"' }),
    );
  });
});

describe("HhClient — token + search", () => {
  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function baseCfg(fetchFn: typeof fetch, over: Record<string, unknown> = {}) {
    return {
      clientId: "cid",
      clientSecret: "secret",
      apiBaseUrl: "https://api.hh.ru",
      tokenUrl: "https://api.hh.ru/token",
      userAgent: "TezHR/test",
      host: "hh.uz",
      fetchFn,
      now: () => 1_000_000,
      ...over,
    };
  }

  it("requests a token and sends HH-User-Agent, host=hh.uz, area + bearer on search", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = url.toString();
      calls.push({ url: u, init });
      if (u.includes("/token")) return jsonResponse({ access_token: "TKN", expires_in: 1800 });
      return jsonResponse({ items: [{ id: "x" }], pages: 1 });
    }) as unknown as typeof fetch;

    const client = new HhClient(baseCfg(fetchFn, { areaId: "2759" }));
    const res = await client.searchResumes({ text: "driver", perPage: 50, page: 0 });
    expect(res.items[0].id).toBe("x");

    const tokenCall = calls.find((c) => c.url.includes("/token"))!;
    expect(String(tokenCall.init?.body)).toContain("grant_type=client_credentials");
    const searchCall = calls.find((c) => c.url.includes("/resumes"))!;
    expect(searchCall.url).toContain("host=hh.uz");
    expect(searchCall.url).toContain("area=2759");
    expect(searchCall.url).toContain("text=driver");
    const headers = searchCall.init?.headers as Record<string, string>;
    expect(headers["HH-User-Agent"]).toBe("TezHR/test");
    expect(headers.Authorization).toBe("Bearer TKN");
  });

  it("caches the token across calls (one token request for two searches)", async () => {
    let tokenReqs = 0;
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/token")) {
        tokenReqs += 1;
        return jsonResponse({ access_token: "TKN", expires_in: 1800 });
      }
      return jsonResponse({ items: [], pages: 0 });
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn));
    await client.searchResumes({ text: "a", perPage: 50, page: 0 });
    await client.searchResumes({ text: "b", perPage: 50, page: 0 });
    expect(tokenReqs).toBe(1);
  });

  it("uses the refresh_token grant when an employer token is provided", async () => {
    let body = "";
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = url.toString();
      if (u.includes("/token")) {
        body = String(init?.body);
        return jsonResponse({ access_token: "EMP", expires_in: 1800 });
      }
      return jsonResponse({ items: [], pages: 0 });
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn, { refreshToken: "RT" }));
    await client.searchResumes({ text: "a", perPage: 50, page: 0 });
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=RT");
    expect(body).not.toContain("client_id=");
    expect(body).not.toContain("client_secret=");
  });

  it("persists rotated refresh tokens", async () => {
    const onToken = vi.fn();
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/token")) {
        return jsonResponse({ access_token: "NEW", refresh_token: "RT2", expires_in: 120 });
      }
      return jsonResponse({ items: [], pages: 0 });
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn, { refreshToken: "RT1", onToken }));
    await client.searchResumes({ text: "a", perPage: 50, page: 0 });
    expect(onToken).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "NEW", refreshToken: "RT2" }),
    );
  });

  it("retries once on a 401 by re-authenticating", async () => {
    let searchHits = 0;
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/token")) return jsonResponse({ access_token: "TKN", expires_in: 1800 });
      searchHits += 1;
      if (searchHits === 1) return jsonResponse({ type: "token_expired" }, 401);
      return jsonResponse({ items: [{ id: "ok" }], pages: 1 });
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn));
    const res = await client.searchResumes({ text: "a", perPage: 50, page: 0 });
    expect(res.items[0].id).toBe("ok");
    expect(searchHits).toBe(2);
  });

  it("throws HhAuthError on a failed token request", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 400 })) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn));
    await expect(client.searchResumes({ text: "a", perPage: 50, page: 0 })).rejects.toBeInstanceOf(
      HhAuthError,
    );
  });

  it("throws HhRequestError on a non-2xx search (after the retry)", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/token")) return jsonResponse({ access_token: "TKN", expires_in: 1800 });
      return new Response("server error", { status: 500 });
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn));
    await expect(client.searchResumes({ text: "a", perPage: 50, page: 0 })).rejects.toBeInstanceOf(
      HhRequestError,
    );
  });

  it("keeps secrets out of request error messages", async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) => {
      const u = url.toString();
      if (u.includes("/token")) return jsonResponse({ access_token: "TKN", expires_in: 1800 });
      return jsonResponse({ error: "bad_authorization", error_description: "refresh_token SUPERSECRET" }, 403);
    }) as unknown as typeof fetch;
    const client = new HhClient(baseCfg(fetchFn));
    await expect(client.searchResumes({ text: "a", perPage: 50, page: 0 })).rejects.toThrow(
      /\[REDACTED\]/,
    );
  });
});
