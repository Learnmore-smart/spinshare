import { describe, it, expect } from "vitest";
import { AdApiClient, type FetchLike, type FetchResponseLike } from "./api-client";

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
      }),
    );
    const client = new AdApiClient({ baseUrl: "https://x.test/", fetchImpl });

    const ad = await client.getAd();

    expect(calls[0].url).toBe("https://x.test/api/ad");
    expect(calls[0].method).toBe("GET");
    expect(ad).toEqual({
      adAvailable: true,
      campaignId: "cmp_1",
      adText: "Hello",
      cpmCents: 1000,
      cpmUsd: "10.00",
    });
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

  it("returns null on failure", async () => {
    const { fetchImpl } = makeFetch(() => jsonResponse({}, false, 401));
    const client = new AdApiClient({ baseUrl: "https://x.test", fetchImpl });

    expect(await client.reportImpression("cmp_9", 3000)).toBeNull();
  });
});
