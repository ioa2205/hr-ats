/**
 * hh.uz / HeadHunter HTTP client: OAuth token management + resume search.
 *
 * Two auth modes, chosen automatically by which credentials are present:
 *  - client_credentials (client id + secret) → an APPLICATION token. Works for
 *    app-level API access with no user interaction — the "paste id+secret and
 *    go" path.
 *  - refresh_token (HH_REFRESH_TOKEN, obtained once via the employer OAuth
 *    consent) → an EMPLOYER token, required if your hh access tier gates resume
 *    search behind an authorized employer. When set, it takes precedence.
 *
 * Everything hh-specific and live-only (token URL, api base, area id, the
 * mandatory User-Agent header) is config here so it's a one-line change, never
 * a rewrite. `fetchFn` and `now` are injectable so token + search logic are
 * unit-tested with no network.
 */
import { HhResumeSearchSchema, HhTokenSchema, type HhResumeSearch } from "./schema";

export interface HhClientConfig {
  clientId: string;
  clientSecret: string;
  /** optional employer token from a one-time OAuth consent (takes precedence). */
  refreshToken?: string;
  apiBaseUrl: string;
  tokenUrl: string;
  userAgent: string;
  /** default area to search (e.g. Uzbekistan/Tashkent); omitted ⇒ all areas. */
  areaId?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export interface HhSearchParams {
  text: string;
  areaId?: string;
  perPage: number;
  page: number;
}

export class HhAuthError extends Error {}
export class HhRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HhRequestError";
  }
}

const TOKEN_MARGIN_MS = 60_000; // refresh a minute early

export class HhClient {
  private readonly cfg: HhClientConfig;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private cached: { value: string; expiresAt: number } | null = null;
  private refreshToken?: string;

  constructor(cfg: HhClientConfig) {
    this.cfg = cfg;
    this.fetchFn = cfg.fetchFn ?? fetch;
    this.now = cfg.now ?? Date.now;
    this.refreshToken = cfg.refreshToken;
  }

  private headers(token?: string): Record<string, string> {
    // hh REQUIRES a descriptive User-Agent or it rejects the request.
    const h: Record<string, string> = { "User-Agent": this.cfg.userAgent };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  private async requestToken(): Promise<void> {
    const body = new URLSearchParams();
    if (this.refreshToken) {
      body.set("grant_type", "refresh_token");
      body.set("refresh_token", this.refreshToken);
    } else {
      body.set("grant_type", "client_credentials");
    }
    body.set("client_id", this.cfg.clientId);
    body.set("client_secret", this.cfg.clientSecret);

    const res = await this.fetchFn(this.cfg.tokenUrl, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HhAuthError(`[sourcing] hh token request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const parsed = HhTokenSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw new HhAuthError("[sourcing] hh token response did not match schema");
    }
    // hh rotates refresh tokens — keep the newest so long-running workers don't
    // fall back to an expired one.
    if (parsed.data.refresh_token) this.refreshToken = parsed.data.refresh_token;
    const ttl = (parsed.data.expires_in ?? 1800) * 1000;
    this.cached = { value: parsed.data.access_token, expiresAt: this.now() + ttl - TOKEN_MARGIN_MS };
  }

  async getToken(): Promise<string> {
    if (this.cached && this.now() < this.cached.expiresAt) return this.cached.value;
    await this.requestToken();
    if (!this.cached) throw new HhAuthError("[sourcing] hh token unavailable after request");
    return this.cached.value;
  }

  /** One page of resume search. Throws on non-2xx (the funnel degrades the source). */
  async searchResumes(params: HhSearchParams): Promise<HhResumeSearch> {
    const run = async (): Promise<Response> => {
      const token = await this.getToken();
      const url = new URL("/resumes", this.cfg.apiBaseUrl);
      if (params.text) url.searchParams.set("text", params.text);
      const area = params.areaId ?? this.cfg.areaId;
      if (area) url.searchParams.set("area", area);
      url.searchParams.set("per_page", String(params.perPage));
      url.searchParams.set("page", String(params.page));
      return this.fetchFn(url.toString(), { method: "GET", headers: this.headers(token) });
    };

    let res = await run();
    if (res.status === 401) {
      // token expired/revoked — drop the cache and retry once.
      this.cached = null;
      res = await run();
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HhRequestError(res.status, `[sourcing] hh resume search failed: ${text.slice(0, 200)}`);
    }
    const parsed = HhResumeSearchSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw new HhRequestError(200, "[sourcing] hh resume search response did not match schema");
    }
    return parsed.data;
  }
}
