import type { AdResponse, TrackResponse } from "@spinshare/core";

/**
 * Minimal, typed HTTP client for the SpinShare APIs used by the VSCode
 * extension.
 *
 * Design notes:
 *   - The client speaks only the two contract endpoints the extension needs:
 *     `GET /api/ad` (bidding) and `POST /api/track` (impression). Request and
 *     response shapes come from `@spinshare/core` so the extension can never
 *     disagree with the server contract.
 *   - The `fetch` implementation is **injectable** (`fetchImpl`). It defaults to
 *     the Node/global `fetch`, but tests inject a stub so they run with no
 *     network. This is what lets task 14.4's property test drive the controller
 *     against a mocked client.
 *   - Network/parse failures are handled gracefully: `getAd` resolves to
 *     `{ adAvailable: false }` rather than throwing, so a transient outage never
 *     breaks the editor; `reportImpression` resolves to `null` on failure.
 *
 * Requirements: 6.3 — request the ad from `GET /api/ad` and report the
 * impression to `POST /api/track`.
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
}

/** Injectable `fetch`-compatible function. */
export type FetchLike = (
  input: string,
  init?: FetchInit,
) => Promise<FetchResponseLike>;

/** Construction options for {@link AdApiClient}. */
export interface AdApiClientOptions {
  /** Base URL of the SpinShare web app, e.g. `https://spinshare.dev`. */
  baseUrl: string;
  /** Optional default bearer token (the Device_Auth_Token). */
  token?: string;
  /**
   * Optional `fetch` implementation. Defaults to the global `fetch`. Tests pass
   * a stub here to avoid real network calls.
   */
  fetchImpl?: FetchLike;
}

/** Default SpinShare web base URL; overridable via extension settings. */
export const DEFAULT_BASE_URL = "https://spinshare.dev";

function resolveDefaultFetch(): FetchLike {
  const globalFetch = (globalThis as { fetch?: unknown }).fetch;
  if (typeof globalFetch !== "function") {
    throw new Error(
      "No global fetch available; pass a fetchImpl to AdApiClient.",
    );
  }
  return globalFetch as FetchLike;
}

/** Narrow an unknown JSON value into an {@link AdResponse}. */
function parseAdResponse(value: unknown): AdResponse {
  if (typeof value !== "object" || value === null) {
    return { adAvailable: false };
  }
  const obj = value as Record<string, unknown>;
  if (obj.adAvailable === true) {
    if (
      typeof obj.campaignId === "string" &&
      typeof obj.adText === "string" &&
      typeof obj.cpmCents === "number" &&
      typeof obj.cpmUsd === "string"
    ) {
      return {
        adAvailable: true,
        campaignId: obj.campaignId,
        adText: obj.adText,
        cpmCents: obj.cpmCents,
        cpmUsd: obj.cpmUsd,
      };
    }
    // Malformed "available" payload — treat as no ad rather than trust it.
    return { adAvailable: false };
  }
  return { adAvailable: false };
}

/**
 * Result of `POST /api/auth/device/start` — the handle a client uses to drive
 * the browser-based device authorization grant. Mirrors the design contract.
 */
export interface DeviceFlowStart {
  /** Opaque code the client polls with; never shown to the user. */
  deviceCode: string;
  /** Short human-readable code the user confirms in the browser. */
  userCode: string;
  /** URL the user visits to approve the device. */
  verificationUri: string;
  /** `verificationUri` pre-filled with the user code for one-click approval. */
  verificationUriComplete: string;
  /** Minimum seconds to wait between token polls. */
  intervalSec: number;
  /** Seconds until the device code expires (the overall flow timeout). */
  expiresInSec: number;
}

/**
 * Outcome of a single `POST /api/auth/device/token` poll. The discriminated
 * `status` lets the auth manager decide whether to keep polling, back off,
 * persist the token, or fail.
 */
export type DeviceTokenResult =
  | { status: "approved"; accessToken: string; tokenType: string }
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "expired" }
  | { status: "denied" };

/** Narrow an unknown JSON value into a {@link DeviceFlowStart}, or `null`. */
function parseDeviceFlowStart(value: unknown): DeviceFlowStart | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.deviceCode === "string" &&
    typeof obj.userCode === "string" &&
    typeof obj.verificationUri === "string" &&
    typeof obj.verificationUriComplete === "string" &&
    typeof obj.intervalSec === "number" &&
    typeof obj.expiresInSec === "number"
  ) {
    return {
      deviceCode: obj.deviceCode,
      userCode: obj.userCode,
      verificationUri: obj.verificationUri,
      verificationUriComplete: obj.verificationUriComplete,
      intervalSec: obj.intervalSec,
      expiresInSec: obj.expiresInSec,
    };
  }
  return null;
}

/** Narrow an unknown JSON value into a {@link TrackResponse}, or `null`. */
function parseTrackResponse(value: unknown): TrackResponse | null {
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
 * Typed client for the SpinShare bidding and tracking endpoints.
 *
 * Stateless apart from configuration; safe to construct once per session and
 * reuse. All methods are side-effect free except for the HTTP call they make.
 */
export class AdApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: AdApiClientOptions) {
    // Trim a single trailing slash so URL joining is predictable.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? resolveDefaultFetch();
  }

  private authHeaders(token?: string): Record<string, string> {
    const bearer = token ?? this.token;
    return bearer ? { Authorization: `Bearer ${bearer}` } : {};
  }

  /**
   * Fetch the current winning advertisement from `GET /api/ad`.
   *
   * Resolves to `{ adAvailable: false }` on any network error, non-OK status,
   * or malformed payload so callers can render a graceful no-ad state.
   *
   * @param token Optional bearer token overriding the instance default.
   */
  async getAd(token?: string): Promise<AdResponse> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/ad`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.authHeaders(token),
        },
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
   * Report a single impression to `POST /api/track`.
   *
   * Resolves to the parsed {@link TrackResponse} on success, or `null` on any
   * network error, non-OK status, or malformed payload. Callers must invoke
   * this at most once per generation to preserve the one-impression invariant.
   *
   * @param campaignId Campaign the impression is attributed to.
   * @param token Optional bearer token overriding the instance default.
   */
  async reportImpression(
    campaignId: string,
    token?: string,
  ): Promise<TrackResponse | null> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.authHeaders(token),
        },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) {
        return null;
      }
      return parseTrackResponse(await res.json());
    } catch {
      return null;
    }
  }

  /**
   * Begin the browser-based device authorization grant via
   * `POST /api/auth/device/start`.
   *
   * Rejects on network error, non-OK status, or malformed payload — the auth
   * manager surfaces this as a failed sign-in attempt rather than silently
   * proceeding unauthenticated.
   */
  async startDeviceFlow(): Promise<DeviceFlowStart> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/auth/device/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`device/start failed with status ${res.status}`);
    }
    const parsed = parseDeviceFlowStart(await res.json());
    if (parsed === null) {
      throw new Error("device/start returned a malformed payload");
    }
    return parsed;
  }

  /**
   * Poll `POST /api/auth/device/token` once for the given device code.
   *
   * Maps the server's status/error shape to a {@link DeviceTokenResult}:
   *   - `200` with an `accessToken` → `approved`.
   *   - `400 { error: "authorization_pending" }` → `pending`.
   *   - `400 { error: "slow_down" }` → `slow_down`.
   *   - `400 { error: "expired_token" }` → `expired`.
   *   - `400 { error: "access_denied" }` → `denied`.
   *
   * Any network error, unexpected status, or unrecognized error is treated as
   * `pending` so a transient blip does not abort an otherwise-valid flow; the
   * overall `expiresInSec` deadline still bounds the loop.
   */
  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult> {
    let res: FetchResponseLike;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/api/auth/device/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ deviceCode }),
      });
    } catch {
      return { status: "pending" };
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const obj =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    if (res.ok) {
      if (typeof obj.accessToken === "string") {
        const tokenType =
          typeof obj.tokenType === "string" ? obj.tokenType : "Bearer";
        return {
          status: "approved",
          accessToken: obj.accessToken,
          tokenType,
        };
      }
      return { status: "pending" };
    }

    switch (obj.error) {
      case "slow_down":
        return { status: "slow_down" };
      case "expired_token":
        return { status: "expired" };
      case "access_denied":
        return { status: "denied" };
      case "authorization_pending":
      default:
        return { status: "pending" };
    }
  }
}
