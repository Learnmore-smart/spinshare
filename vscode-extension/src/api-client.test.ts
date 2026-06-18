import { describe, it, expect } from "vitest";
import {
  AdApiClient,
  type FetchLike,
  type FetchResponseLike,
} from "./api-client";

/** Build a fetch stub that records calls and returns canned JSON. */
function makeFetch(
  responder: (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => FetchResponseLike | Promise<FetchResponseLike>,
): { fetchImpl: FetchLike; calls: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: string }> } {
  const calls: Array<{ url: string; method?: string; headers?: Record<string, string>; body?: string }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method, headers: init?.headers, body: init?.body });
    return responder(url, init);
  };
  return { fetchImpl, calls };
}

function jsonResponse(body: unknown, ok = true, status = 200): FetchResponseLike {
  const serialized = JSON.stringify(body);
  return {
    ok,
    status,
    json: async () => body,
    text: async () => serialized,
  };
}

describe("AdApiClient.getAd", () => {
  it("fetches GET {baseUrl}/api/ad and parses an available ad", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        adAvailable: true,
        campaignId: "cmp_1",
        adText: "Hello",
        cpmCents: 1000,
        cpmUsd: "10.00",
        accumulatedViewDurationMs: 1000,
        remainingViewDurationMs: 2000,
      }),
    );
    const client = new AdApiClient({
      baseUrl: "https://x.test/",
      token: "tok",
      fetchImpl,
    });

    const ad = await client.getAd();

    expect(calls[0].url).toBe("https://x.test/api/ad");
    expect(calls[0].method).toBe("GET");
    expect(ad).toEqual({
      adAvailable: true,
      campaignId: "cmp_1",
      adText: "Hello",
      cpmCents: 1000,
      cpmUsd: "10.00",
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
  });

  it("returns adAvailable:false without fetching when no bearer token exists", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        adAvailable: true,
        campaignId: "cmp_1",
        adText: "Hello",
        cpmCents: 1000,
        cpmUsd: "10.00",
      }),
    );
    const client = new AdApiClient({ baseUrl: "https://x.test/", fetchImpl });

    await expect(client.getAd()).resolves.toEqual({ adAvailable: false });
    expect(calls).toHaveLength(0);
  });

  it("returns adAvailable:false on network error", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error("offline");
    };
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    expect(await client.getAd()).toEqual({ adAvailable: false });
  });

  it("returns adAvailable:false on non-OK status", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({}, false, 500));
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    expect(await client.getAd()).toEqual({ adAvailable: false });
  });

  it("attaches a bearer token when provided", async () => {
    const { fetchImpl, calls } = makeFetch(() => jsonResponse({ adAvailable: false }));
    const client = new AdApiClient({ baseUrl: "https://x.test", token: "tok", fetchImpl });

    await client.getAd();

    expect(calls[0].headers?.Authorization).toBe("Bearer tok");
  });
});

describe("AdApiClient.reportImpression", () => {
  it("POSTs {baseUrl}/api/track with the campaignId and view duration, then parses the response", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({ recorded: true, developerCreditCents: 18, developerCreditUsd: "0.18" }),
    );
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    const res = await client.reportImpression("cmp_9", 3000, "tok2");

    expect(calls[0].url).toBe("https://x.test/api/track");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers?.Authorization).toBe("Bearer tok2");
    expect(calls[0].body).toBe(
      JSON.stringify({ campaignId: "cmp_9", viewDurationMs: 3000 }),
    );
    expect(res).toEqual({ recorded: true, developerCreditCents: 18, developerCreditUsd: "0.18" });
  });

  it("parses cumulative progress responses without treating them as failures", async () => {
    const { fetchImpl } = makeFetch(() =>
      jsonResponse({
        recorded: false,
        accumulatedViewDurationMs: 1000,
        remainingViewDurationMs: 2000,
      }),
    );
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    const res = await client.reportImpression("cmp_9", 1000, "tok2");

    expect(res).toEqual({
      recorded: false,
      accumulatedViewDurationMs: 1000,
      remainingViewDurationMs: 2000,
    });
  });

  it("returns null on failure", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({}, false, 401));
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    expect(await client.reportImpression("cmp_9", 3000)).toBeNull();
  });
});

describe("AdApiClient.validateDeviceToken", () => {
  it("GETs the side-effect-free validation endpoint with bearer auth", async () => {
    const { fetchImpl, calls } = makeFetch(() => jsonResponse({ valid: true }));
    const client = new AdApiClient({
      baseUrl: "https://x.test/",
      token: "tok",
      fetchImpl,
    });

    await expect(client.validateDeviceToken()).resolves.toBe("valid");
    expect(calls[0].url).toBe("https://x.test/api/auth/device/validate");
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers?.Authorization).toBe("Bearer tok");
  });

  it("returns invalid on a 401 validation response", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({ valid: false }, false, 401));
    const client = new AdApiClient({
      baseUrl: "https://x.test",
      token: "tok_bad",
      fetchImpl,
    });

    await expect(client.validateDeviceToken()).resolves.toBe("invalid");
  });

  it("returns unknown on transient validation failures", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new Error("offline");
    };
    const client = new AdApiClient({
      baseUrl: "https://x.test",
      token: "tok_maybe",
      fetchImpl,
    });

    await expect(client.validateDeviceToken()).resolves.toBe("unknown");
  });

  it("returns invalid without fetching when no bearer token exists", async () => {
    const { fetchImpl, calls } = makeFetch(() => jsonResponse({ valid: true }));
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    await expect(client.validateDeviceToken()).resolves.toBe("invalid");
    expect(calls).toHaveLength(0);
  });
});

describe("AdApiClient.startDeviceFlow", () => {
  it("canonicalizes the production apex host before POSTing device/start", async () => {
    const { fetchImpl, calls } = makeFetch(() =>
      jsonResponse({
        deviceCode: "dc_1",
        userCode: "WXYZ-1234",
        verificationUri: "https://www.spinshare.dev/activate",
        verificationUriComplete:
          "https://www.spinshare.dev/activate?user_code=WXYZ-1234",
        intervalSec: 5,
        expiresInSec: 300,
      }),
    );
    const client = new AdApiClient({
      baseUrl: "https://spinshare.dev/",
      fetchImpl,
    });

    await client.startDeviceFlow();

    expect(calls[0].url).toBe(
      "https://www.spinshare.dev/api/auth/device/start",
    );
    expect(calls[0].method).toBe("POST");
  });
});
