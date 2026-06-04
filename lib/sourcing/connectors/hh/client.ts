/**
 * hh.uz / HeadHunter HTTP client: OAuth token management + resume search.
 *
 * Resume search is an employer/payable API, so an application token is not
 * sufficient. Live sourcing should be backed by a user/employer refresh token,
 * either platform-wide or per company. This client accepts persisted token
 * state and calls `onToken` whenever hh rotates the refresh token.
 */
import { HhResumeSearchSchema, HhTokenSchema, type HhResumeSearch } from "./schema";

export interface HhClientConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  accessExpiresAt?: number | string | Date | null;
  apiBaseUrl: string;
  tokenUrl: string;
  userAgent: string;
  /** HH site selector. For this product the default is hh.uz, not hh.ru. */
  host: string;
  /** default area to search (e.g. Uzbekistan/Tashkent); omitted => all areas. */
  areaId?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  onToken?(state: HhPersistedTokenState): Promise<void> | void;
}

export interface HhPersistedTokenState {
  accessToken: string;
  accessExpiresAt: string;
  refreshToken?: string;
}

export interface HhSearchParams {
  text: string;
  areaId?: string;
  perPage: number;
  page: number;
}

export interface HhMe {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  employer?: { id?: string; name?: string } | null;
  manager?: { id?: string } | null;
  personal_manager?: { id?: string } | null;
}

export interface HhErrorInfo {
  status?: number;
  code?: string;
  message: string;
}

export class HhAuthError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(info: HhErrorInfo) {
    super(info.message);
    this.name = "HhAuthError";
    this.status = info.status;
    this.code = info.code;
  }
}

export class HhRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "HhRequestError";
  }
}

const TOKEN_MARGIN_MS = 60_000; // refresh a minute early
const REDACTED = "[REDACTED]";

function expiryMs(value: HhClientConfig["accessExpiresAt"]): number | null {
  if (!value) return null;
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function redact(input: string): string {
  return input
    .replace(/(access_token|refresh_token|client_secret)["'=:\s]+[^"',\s}]+/gi, `$1=${REDACTED}`)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .slice(0, 240);
}

async function parseError(res: Response): Promise<{ code?: string; detail: string }> {
  const text = await res.text().catch(() => "");
  if (!text) return { detail: "" };
  try {
    const json = JSON.parse(text) as {
      error?: string;
      error_description?: string;
      type?: string;
      value?: string;
      description?: string;
      errors?: Array<{ type?: string; value?: string }>;
    };
    const first = Array.isArray(json.errors) ? json.errors[0] : undefined;
    const code = json.error ?? json.type ?? first?.type;
    const value = json.error_description ?? json.value ?? first?.value ?? json.description;
    return { code, detail: redact([code, value].filter(Boolean).join(": ")) };
  } catch {
    return { detail: redact(text) };
  }
}

function isExpiredAuth(status: number, code?: string, detail?: string): boolean {
  const haystack = `${code ?? ""} ${detail ?? ""}`.toLowerCase();
  return (status === 401 || status === 403) && haystack.includes("token_expired");
}

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
    const expiresAt = expiryMs(cfg.accessExpiresAt);
    if (cfg.accessToken && expiresAt && this.now() < expiresAt - TOKEN_MARGIN_MS) {
      this.cached = { value: cfg.accessToken, expiresAt: expiresAt - TOKEN_MARGIN_MS };
    }
  }

  private headers(token?: string): Record<string, string> {
    // hh requires HH-User-Agent specifically; standard User-Agent is not enough.
    const h: Record<string, string> = { "HH-User-Agent": this.cfg.userAgent };
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
      body.set("client_id", this.cfg.clientId);
      body.set("client_secret", this.cfg.clientSecret);
    }

    const res = await this.fetchFn(this.cfg.tokenUrl, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const parsed = await parseError(res);
      throw new HhAuthError({
        status: res.status,
        code: parsed.code,
        message: `[sourcing] hh token request failed (${res.status}): ${parsed.detail}`,
      });
    }
    const parsed = HhTokenSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw new HhAuthError({ message: "[sourcing] hh token response did not match schema" });
    }

    if (parsed.data.refresh_token) this.refreshToken = parsed.data.refresh_token;
    const ttl = (parsed.data.expires_in ?? 1800) * 1000;
    const accessExpiresAtMs = this.now() + ttl;
    this.cached = { value: parsed.data.access_token, expiresAt: accessExpiresAtMs - TOKEN_MARGIN_MS };
    await this.cfg.onToken?.({
      accessToken: parsed.data.access_token,
      accessExpiresAt: new Date(accessExpiresAtMs).toISOString(),
      refreshToken: parsed.data.refresh_token,
    });
  }

  async getToken(): Promise<string> {
    if (this.cached && this.now() < this.cached.expiresAt) return this.cached.value;
    await this.requestToken();
    if (!this.cached) throw new HhAuthError({ message: "[sourcing] hh token unavailable after request" });
    return this.cached.value;
  }

  /** One page of resume search. Throws on non-2xx (the funnel degrades the source). */
  async searchResumes(params: HhSearchParams): Promise<HhResumeSearch> {
    const run = async (): Promise<Response> => {
      const token = await this.getToken();
      const url = new URL("/resumes", this.cfg.apiBaseUrl);
      url.searchParams.set("host", this.cfg.host);
      if (params.text) url.searchParams.set("text", params.text);
      const area = params.areaId ?? this.cfg.areaId;
      if (area) url.searchParams.set("area", area);
      url.searchParams.set("per_page", String(params.perPage));
      url.searchParams.set("page", String(params.page));
      return this.fetchFn(url.toString(), { method: "GET", headers: this.headers(token) });
    };

    let res = await run();
    if (res.status === 401 || res.status === 403) {
      const parsed = await parseError(res.clone());
      if (isExpiredAuth(res.status, parsed.code, parsed.detail)) {
        this.cached = null;
        res = await run();
      }
    }
    if (!res.ok) {
      const parsed = await parseError(res);
      throw new HhRequestError(
        res.status,
        `[sourcing] hh resume search failed: ${parsed.detail}`,
        parsed.code,
      );
    }
    const parsed = HhResumeSearchSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
      throw new HhRequestError(200, "[sourcing] hh resume search response did not match schema");
    }
    return parsed.data;
  }

  /** Cheap health probe: verifies auth and employer context without opening a resume. */
  async getMe(): Promise<HhMe> {
    const token = await this.getToken();
    const url = new URL("/me", this.cfg.apiBaseUrl);
    url.searchParams.set("host", this.cfg.host);
    const res = await this.fetchFn(url.toString(), { method: "GET", headers: this.headers(token) });
    if (!res.ok) {
      const parsed = await parseError(res);
      throw new HhRequestError(res.status, `[sourcing] hh /me failed: ${parsed.detail}`, parsed.code);
    }
    return (await res.json().catch(() => ({}))) as HhMe;
  }
}

export interface HhAuthCodeExchangeConfig {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  userAgent: string;
  fetchFn?: typeof fetch;
}

export async function exchangeHhAuthorizationCode(
  cfg: HhAuthCodeExchangeConfig,
): Promise<HhPersistedTokenState> {
  const fetchFn = cfg.fetchFn ?? fetch;
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("redirect_uri", cfg.redirectUri);
  body.set("code", cfg.code);

  const res = await fetchFn(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "HH-User-Agent": cfg.userAgent,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const parsed = await parseError(res);
    throw new HhAuthError({
      status: res.status,
      code: parsed.code,
      message: `[sourcing] hh authorization_code exchange failed (${res.status}): ${parsed.detail}`,
    });
  }

  const parsed = HhTokenSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success || !parsed.data.refresh_token) {
    throw new HhAuthError({ message: "[sourcing] hh authorization response did not include a refresh token" });
  }

  const expiresIn = parsed.data.expires_in ?? 1800;
  return {
    accessToken: parsed.data.access_token,
    accessExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshToken: parsed.data.refresh_token,
  };
}
