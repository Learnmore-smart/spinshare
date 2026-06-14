import type { AdResponse, TrackResponse } from "@spinshare/core";

/**
 * @spinshare/cli — typed HTTP client for the SpinShare APIs (task 13.4).
 *
 * Design notes:
 *   - Speaks only the two contract endpoints the wrapper needs: `GET /api/ad`
 *     (bidding) and `POST /api/track` (impression). Request/response shapes come
 *     from `@spinshare/core` so the CLI can never disagree with the server.
 *   - The `fetch` implementation is **injectable** (`fetchImpl`), defaulting to
 *     the global/Node `fetch`. Tests inject a stub so they run with no network.
 *   - The base URL is resolved from the environment/config (`SPINSHARE_API_URL`
 *     / `SPINSHARE_BASE_URL`), and the Device_Auth_Token from a **token getter**
 *     (`tokenProvider`). Real credential storage lands in task 13.7; until then
 *     the getter reads `SPINSHARE_TOKEN` from the environment. Plumbing the token
 *     as a getter means a token stored after construction is still picked up.
 *   - Network/parse failures are handled gracefully: `getAd` resolves to
 *     `{ adAvailable: false }` rather than throwing, and `reportImpression`
 *     resolves to `null`, so a transient outage never breaks the wrapped command.
 *
 * Requirements: 5.2 (ad text source), 5.7 (impression reporting).
 */

/** The subset of `RequestInit` this client uses. */
export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** The subset of `Response` this client reads. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

/** Injectable `fetch`-compatible function. */
export type FetchLike = (
  input: string,
  init?: FetchInit,
) => Promise<FetchResponseLike>;

/** A function returning the current Device_Auth_Token, or `undefined`/`null`. */
export type TokenProvider = () => string | null | undefined;

/** Construction options for {@link CliApiClient}. */
export interface CliApiClientOptions {
  /** Base URL of the SpinShare web app, e.g. `https://spinshare.dev`. */
  baseUrl?: string;
  /**
   * Token getter (preferred). Evaluated lazily per request so a token stored
   * after construction is still used. Takes precedence over {@link token}.
   */
  tokenProvider?: TokenProvider;
  /** Optional static bearer token (the Device_Auth_Token). */
  token?: string;
  /**
   * Optional `fetch` implementation. Defaults to the global `fetch`. Tests pass
   * a stub here to avoid real network calls.
   */
  fetchImpl?: FetchLike;
}

/** Default SpinShare web base URL; overridable via env/config. */
export const DEFAULT_BASE_URL = "https://www.spinshare.dev";

/**
 * Resolve the API base URL from explicit option → environment → default.
 * Reads `SPINSHARE_API_URL`, then `SPINSHARE_BASE_URL`.
 */
export function resolveBaseUrl(
  explicit?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = env.SPINSHARE_API_URL ?? env.SPINSHARE_BASE_URL;
  return (explicit ?? fromEnv ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/**
 * Default token getter: reads `SPINSHARE_TOKEN` from the environment. This is a
 * placeholder until task 13.7 wires keytar / `0600` config-file storage.
 */
export function envTokenProvider(
  env: NodeJS.ProcessEnv = process.env,
): TokenProvider {
  return () => env.SPINSHARE_TOKEN;
}

function resolveDefaultFetch(): FetchLike {
  const globalFetch = (globalThis as { fetch?: unknown }).fetch;
  if (typeof globalFetch !== "function") {
    throw new Error("No global fetch available; pass a fetchImpl to CliApiClient.");
  }
  return globalFetch as FetchLike;
}

/** Parse a fetch body as JSON; throw a helpful error when the server returns HTML. */
export async function readJsonBody(
  res: FetchResponseLike,
  context: string,
): Promise<unknown> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    const html = raw.trimStart().startsWith("<!");
    const hint = html
      ? `Server returned HTML instead of JSON — is SpinShare deployed at this URL? For local dev run \`pnpm dev\` then \`pnpm cli:login:local\` (or set SPINSHARE_BASE_URL=http://localhost:3000).`
      : "Server returned a non-JSON response.";
    throw new Error(`${context} (${res.status}): ${hint}`);
  }
}

// ---------------------------------------------------------------------------
// Device-authorization flow (task 13.7 — `spinshare login`)
// ---------------------------------------------------------------------------

/**
 * Parsed `POST /api/auth/device/start` response. Mirrors the web contract:
 * `{ deviceCode, userCode, verificationUri, verificationUriComplete,
 *    intervalSec, expiresInSec }`.
 */
export interface DeviceFlowStart {
  /** Opaque code the client presents while polling for the token. */
  deviceCode: string;
  /** Human-readable code the user confirms in the browser. */
  userCode: string;
  /** Base verification URL (manual-entry fallback). */
  verificationUri: string;
  /** Verification URL with the user code pre-filled (browser launch target). */
  verificationUriComplete: string;
  /** Minimum seconds to wait between token polls. */
  intervalSec: number;
  /** Seconds until the device code expires (overall timeout bound). */
  expiresInSec: number;
}

/**
 * Discriminated result of one `POST /api/auth/device/token` poll. The web
 * endpoint returns `200 { accessToken, tokenType }` on approval, otherwise
 * `400 { error }` with one of the OAuth device-flow error codes. Any unexpected
 * shape/status maps to `{ status: "error" }` so callers can fail gracefully.
 */
export type DeviceTokenPoll =
  | { status: "approved"; accessToken: string; tokenType: string }
  | { status: "authorization_pending" }
  | { status: "slow_down" }
  | { status: "expired_token" }
  | { status: "access_denied" }
  | { status: "error"; message: string };

/** Minimal interface the `login` flow depends on; {@link CliApiClient} implements it. */
export interface DeviceAuthApi {
  /** Optional — printed at the start of `spinshare login`. */
  getBaseUrl?(): string;
  startDeviceFlow(): Promise<DeviceFlowStart>;
  pollDeviceToken(deviceCode: string): Promise<DeviceTokenPoll>;
}

/** Default device-flow polling interval (seconds) when the server omits it. */
export const DEFAULT_DEVICE_INTERVAL_SEC = 5;
/** Default device-flow expiry (seconds) when the server omits it. */
export const DEFAULT_DEVICE_EXPIRES_SEC = 300;

/** Narrow an unknown JSON value into a {@link DeviceFlowStart}, or `null`. */
export function parseDeviceFlowStart(value: unknown): DeviceFlowStart | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.deviceCode !== "string" ||
    typeof obj.userCode !== "string" ||
    typeof obj.verificationUri !== "string"
  ) {
    return null;
  }
  const verificationUriComplete =
    typeof obj.verificationUriComplete === "string"
      ? obj.verificationUriComplete
      : obj.verificationUri;
  const intervalSec =
    typeof obj.intervalSec === "number" && obj.intervalSec > 0
      ? obj.intervalSec
      : DEFAULT_DEVICE_INTERVAL_SEC;
  const expiresInSec =
    typeof obj.expiresInSec === "number" && obj.expiresInSec > 0
      ? obj.expiresInSec
      : DEFAULT_DEVICE_EXPIRES_SEC;
  return {
    deviceCode: obj.deviceCode,
    userCode: obj.userCode,
    verificationUri: obj.verificationUri,
    verificationUriComplete,
    intervalSec,
    expiresInSec,
  };
}

const DEVICE_ERROR_CODES = [
  "authorization_pending",
  "slow_down",
  "expired_token",
  "access_denied",
] as const;

/**
 * Map a `POST /api/auth/device/token` HTTP status + JSON body to a
 * {@link DeviceTokenPoll}. A `200` with a string `accessToken` is an approval;
 * a `400` with a recognized `error` maps to that status; anything else is an
 * `error` result.
 */
export function parseDeviceTokenResponse(
  status: number,
  value: unknown,
): DeviceTokenPoll {
  const obj =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  if (status >= 200 && status < 300) {
    if (typeof obj.accessToken === "string" && obj.accessToken.length > 0) {
      return {
        status: "approved",
        accessToken: obj.accessToken,
        tokenType:
          typeof obj.tokenType === "string" ? obj.tokenType : "Bearer",
      };
    }
    return { status: "error", message: "Malformed token response." };
  }
  const error = obj.error;
  if (typeof error === "string") {
    const matched = DEVICE_ERROR_CODES.find((code) => code === error);
    if (matched !== undefined) {
      return { status: matched };
    }
    return { status: "error", message: error };
  }
  return { status: "error", message: `Unexpected status ${status}.` };
}

/** Narrow an unknown JSON value into an {@link AdResponse}. */
export function parseAdResponse(value: unknown): AdResponse {
  if (typeof value !== "object" || value === null) {
    return { adAvailable: false };
  }
  const obj = value as Record<string, unknown>;
  if (
    obj.adAvailable === true &&
    typeof obj.campaignId === "string" &&
    typeof obj.adText === "string" &&
    typeof obj.cpmCents === "number" &&
    typeof obj.cpmUsd === "string"
  ) {
    return {
      adAvailable: true,
      campaignId: obj.campaignId,
      adText: obj.adText,
      ...(typeof obj.destinationUrl === "string"
        ? { destinationUrl: obj.destinationUrl }
        : {}),
      ...(typeof obj.brandName === "string"
        ? { brandName: obj.brandName }
        : {}),
      cpmCents: obj.cpmCents,
      cpmUsd: obj.cpmUsd,
    };
  }
  return { adAvailable: false };
}

/** Narrow an unknown JSON value into a {@link TrackResponse}, or `null`. */
export function parseTrackResponse(value: unknown): TrackResponse | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (
    obj.recorded === true &&
    typeof obj.developerCreditCents === "number" &&
    typeof obj.developerCreditUsd === "string"
  ) {
    return {
      recorded: true,
      developerCreditCents: obj.developerCreditCents,
      developerCreditUsd: obj.developerCreditUsd,
    };
  }
  return null;
}

/**
 * Typed client for the SpinShare bidding and tracking endpoints used by the CLI.
 *
 * Stateless apart from configuration; construct once per run and reuse.
 */
export class CliApiClient implements DeviceAuthApi {
  private readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider;
  private readonly fetchImpl: FetchLike;

  constructor(options: CliApiClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.tokenProvider =
      options.tokenProvider ??
      (options.token !== undefined ? () => options.token : envTokenProvider());
    this.fetchImpl = options.fetchImpl ?? resolveDefaultFetch();
  }

  /** Resolved API base URL (for status messages in `spinshare login`). */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  private authHeaders(): Record<string, string> {
    const bearer = this.tokenProvider();
    return bearer ? { Authorization: `Bearer ${bearer}` } : {};
  }

  /**
   * Begin the browser device-authorization flow via `POST /api/auth/device/start`.
   *
   * Throws on a network error, non-OK status, or malformed payload — the caller
   * (`runLogin`) reports this as a login failure (there is nothing to poll yet).
   */
  async startDeviceFlow(): Promise<DeviceFlowStart> {
    let res: FetchResponseLike;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/api/auth/device/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: "{}",
      });
    } catch (err) {
      throw new Error(
        `Could not reach SpinShare to start login: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (!res.ok) {
      throw new Error(`Failed to start device flow (status ${res.status}).`);
    }
    const body = await readJsonBody(res, "device/start failed");
    const parsed = parseDeviceFlowStart(body);
    if (parsed === null) {
      throw new Error("Malformed device-flow start response.");
    }
    return parsed;
  }

  /**
   * Poll `POST /api/auth/device/token` once for the given device code.
   *
   * Never throws: network/parse failures resolve to `{ status: "error" }` so the
   * polling loop can decide whether to retry or abort.
   */
  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenPoll> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/auth/device/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ deviceCode }),
      });
      const body = await readJsonBody(res, "device/token failed");
      return parseDeviceTokenResponse(res.status, body);
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Fetch the current winning advertisement from `GET /api/ad`.
   *
   * Resolves to `{ adAvailable: false }` on any network error, non-OK status, or
   * malformed payload so the wrapper can fall back to a neutral state.
   */
  async getAd(): Promise<AdResponse> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/ad`, {
        method: "GET",
        headers: { Accept: "application/json", ...this.authHeaders() },
      });
      if (!res.ok) {
        return { adAvailable: false };
      }
      return parseAdResponse(await res.json());
    } catch {
      return { adAvailable: false };
    }
  }

  /**
   * Report a single eligible impression to `POST /api/track`.
   *
   * Resolves to the parsed {@link TrackResponse} on success, or `null` on any
   * network error, non-OK status, or malformed payload. Callers must invoke this
   * at most once per wait state after the viewability floor is reached to
   * preserve the one-impression invariant.
   */
  async reportImpression(
    campaignId: string,
    viewDurationMs: number,
    token?: string,
  ): Promise<TrackResponse | null> {
    const bearer = token ?? this.tokenProvider();
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({ campaignId, viewDurationMs }),
      });
      if (!res.ok) {
        return null;
      }
      return parseTrackResponse(await res.json());
    } catch {
      return null;
    }
  }
}
