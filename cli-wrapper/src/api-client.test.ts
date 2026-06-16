import { describe, expect, it } from "vitest";
import {
  CliApiClient,
  resolveBaseUrl,
  parseAdResponse,
  parseTrackResponse,
  parseDeviceFlowStart,
  parseDeviceTokenResponse,
  DEFAULT_BASE_URL,
  type FetchLike,
  type FetchResponseLike,
} from "./api-client.js";

function jsonResponse(status: number, body: unknown): FetchResponseLike {
  const serialized = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => serialized,
  };
}

describe("resolveBaseUrl", () => {
  it("prefers explicit, then env, then default; trims trailing slashes", () => {
    expect(resolveBaseUrl("https://x.dev/", {})).toBe("https://x.dev");
    expect(resolveBaseUrl(undefined, { SPINSHARE_API_URL: "https://a.dev" })).toBe(
      "https://a.dev",
    );
    expect(resolveBaseUrl(undefined, { SPINSHARE_BASE_URL: "https://b.dev/" })).toBe(
      "https://b.dev",
    );
    expect(resolveBaseUrl(undefined, {})).toBe(DEFAULT_BASE_URL);
  });

  it("canonicalizes the SpinShare production apex host to avoid POST redirects", () => {
    expect(resolveBaseUrl("https://spinshare.dev/", {})).toBe(
      "https://www.spinshare.dev",
    );
    expect(
      resolveBaseUrl(undefined, { SPINSHARE_BASE_URL: "https://spinshare.dev/" }),
    ).toBe("https://www.spinshare.dev");
  });
});

describe("parseAdResponse / parseTrackResponse", () => {
  it("accepts a well-formed ad payload", () => {
    expect(
      parseAdResponse({
        adAvailable: true,
        campaignId: "c",
        adText: "a",
        cpmCents: 1,
        cpmUsd: "0.01",
        accumulatedViewDurationMs: 1000,
        remainingViewDurationMs: 2000,
      }),
    ).toEqual({
      adAvailable: true,
      campaignId: "c",
      adText: "a",
      cpmCents: 1,
      cpmUsd: "0.01",
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
  });

  it("falls back to unavailable on malformed ad payloads", () => {
    expect(parseAdResponse(null)).toEqual({ adAvailable: false });
    expect(parseAdResponse({ adAvailable: true })).toEqual({ adAvailable: false });
    expect(parseAdResponse({ adAvailable: false })).toEqual({ adAvailable: false });
  });

  it("parses a track response and rejects malformed ones", () => {
    expect(
      parseTrackResponse({
        recorded: true,
        developerCreditCents: 18,
        developerCreditUsd: "0.18",
      }),
    ).toEqual({ recorded: true, developerCreditCents: 18, developerCreditUsd: "0.18" });
    expect(
      parseTrackResponse({
        recorded: false,
        accumulatedViewDurationMs: 1000,
        remainingViewDurationMs: 2000,
      }),
    ).toEqual({
      recorded: false,
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
    expect(parseTrackResponse({ recorded: false })).toBeNull();
    expect(parseTrackResponse(null)).toBeNull();
  });
});

describe("CliApiClient", () => {
  it("GET /api/ad attaches a bearer token from the token getter", async () => {
    const calls: Array<{ url: string; init?: Parameters<FetchLike>[1] }> = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, {
        adAvailable: true,
        campaignId: "c",
        adText: "a",
        cpmCents: 1,
        cpmUsd: "0.01",
      });
    };
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      tokenProvider: () => "tok123",
      fetchImpl,
    });
    const ad = await client.getAd();
    expect(ad.adAvailable).toBe(true);
    const firstCall = calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.url).toBe("https://x.dev/api/ad");
    expect(firstCall?.init?.headers?.Authorization).toBe("Bearer tok123");
  });

  it("GET /api/ad returns unavailable without fetching when no bearer token exists", async () => {
    let calls = 0;
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      tokenProvider: () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200, {
          adAvailable: true,
          campaignId: "c",
          adText: "a",
          cpmCents: 1,
          cpmUsd: "0.01",
        });
      },
    });

    await expect(client.getAd()).resolves.toEqual({ adAvailable: false });
    expect(calls).toBe(0);
  });

  it("getAd resolves to unavailable on non-OK and on network error", async () => {
    const errClient = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => {
        throw new Error("boom");
      },
    });
    expect(await errClient.getAd()).toEqual({ adAvailable: false });

    const badClient = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => jsonResponse(500, {}),
    });
    expect(await badClient.getAd()).toEqual({ adAvailable: false });
  });

  it("POST /api/track sends the campaignId and view duration, then returns the parsed response", async () => {
    let captured: Parameters<FetchLike>[1] | undefined;
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      token: "tok",
      fetchImpl: async (_url, init) => {
        captured = init;
        return jsonResponse(200, {
          recorded: true,
          developerCreditCents: 18,
          developerCreditUsd: "0.18",
        });
      },
    });
    const res = await client.reportImpression("cmp_1", 3000);
    expect(res).toEqual({
      recorded: true,
      developerCreditCents: 18,
      developerCreditUsd: "0.18",
    });
    expect(captured?.method).toBe("POST");
    expect(captured?.headers?.Authorization).toBe("Bearer tok");
    expect(JSON.parse(captured?.body ?? "{}")).toEqual({
      campaignId: "cmp_1",
      viewDurationMs: 3000,
    });
  });

  it("reportImpression resolves to null on failure", async () => {
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => jsonResponse(401, {}),
    });
    expect(await client.reportImpression("cmp_1", 3000)).toBeNull();
  });
});

describe("device flow", () => {
  const startBody = {
    deviceCode: "dc_1",
    userCode: "WXYZ-1234",
    verificationUri: "https://x.dev/activate",
    verificationUriComplete: "https://x.dev/activate?user_code=WXYZ-1234",
    intervalSec: 5,
    expiresInSec: 300,
  };

  it("parseDeviceFlowStart accepts a full payload and applies defaults", () => {
    expect(parseDeviceFlowStart(startBody)).toEqual(startBody);
    const minimal = parseDeviceFlowStart({
      deviceCode: "d",
      userCode: "u",
      verificationUri: "https://x.dev/a",
    });
    expect(minimal).toEqual({
      deviceCode: "d",
      userCode: "u",
      verificationUri: "https://x.dev/a",
      verificationUriComplete: "https://x.dev/a",
      intervalSec: 5,
      expiresInSec: 300,
    });
    expect(parseDeviceFlowStart(null)).toBeNull();
    expect(parseDeviceFlowStart({ deviceCode: "d" })).toBeNull();
  });

  it("parseDeviceTokenResponse maps success and every error code", () => {
    expect(
      parseDeviceTokenResponse(200, { accessToken: "tok", tokenType: "Bearer" }),
    ).toEqual({ status: "approved", accessToken: "tok", tokenType: "Bearer" });
    expect(parseDeviceTokenResponse(400, { error: "authorization_pending" })).toEqual({
      status: "authorization_pending",
    });
    expect(parseDeviceTokenResponse(400, { error: "slow_down" })).toEqual({
      status: "slow_down",
    });
    expect(parseDeviceTokenResponse(400, { error: "expired_token" })).toEqual({
      status: "expired_token",
    });
    expect(parseDeviceTokenResponse(400, { error: "access_denied" })).toEqual({
      status: "access_denied",
    });
    expect(parseDeviceTokenResponse(400, { error: "weird" }).status).toBe("error");
    expect(parseDeviceTokenResponse(200, {}).status).toBe("error");
  });

  it("CliApiClient.startDeviceFlow posts and parses", async () => {
    let url = "";
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async (u) => {
        url = u;
        return jsonResponse(200, startBody);
      },
    });
    const start = await client.startDeviceFlow();
    expect(url).toBe("https://x.dev/api/auth/device/start");
    expect(start.deviceCode).toBe("dc_1");
  });

  it("startDeviceFlow throws on non-OK status", async () => {
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => jsonResponse(500, {}),
    });
    await expect(client.startDeviceFlow()).rejects.toThrow();
  });

  it("startDeviceFlow throws a helpful error when the server returns HTML", async () => {
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "<!doctype html><html></html>",
      }),
    });
    await expect(client.startDeviceFlow()).rejects.toThrow(/HTML instead of JSON/);
  });

  it("pollDeviceToken sends the deviceCode and never throws", async () => {
    let captured: Parameters<FetchLike>[1] | undefined;
    const client = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async (_u, init) => {
        captured = init;
        return jsonResponse(400, { error: "authorization_pending" });
      },
    });
    const res = await client.pollDeviceToken("dc_9");
    expect(JSON.parse(captured?.body ?? "{}")).toEqual({ deviceCode: "dc_9" });
    expect(res.status).toBe("authorization_pending");

    const errClient = new CliApiClient({
      baseUrl: "https://x.dev",
      fetchImpl: async () => {
        throw new Error("boom");
      },
    });
    expect((await errClient.pollDeviceToken("dc")).status).toBe("error");
  });
});
