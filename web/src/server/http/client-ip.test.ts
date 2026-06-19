import { describe, expect, it } from "vitest";

import { extractClientSignals, parseClientIp } from "./client-ip";

function headersFrom(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("parseClientIp", () => {
  it("takes the entry one hop in from the right by default (1 trusted proxy)", () => {
    // client, edge-proxy. Rightmost is infra; client is one in from the right.
    const h = headersFrom({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(parseClientIp(h, {})).toBe("203.0.113.7");
  });

  it("honors a configured trusted-proxy hop count", () => {
    const h = headersFrom({
      "x-forwarded-for": "203.0.113.7, 70.0.0.1, 10.0.0.1",
    });
    expect(parseClientIp(h, { TRUSTED_PROXY_HOP_COUNT: "2" })).toBe(
      "203.0.113.7",
    );
  });

  it("never reads past the leftmost entry when the chain is short", () => {
    const h = headersFrom({ "x-forwarded-for": "203.0.113.7" });
    expect(parseClientIp(h, { TRUSTED_PROXY_HOP_COUNT: "5" })).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip then null", () => {
    expect(parseClientIp(headersFrom({ "x-real-ip": "198.51.100.9" }), {})).toBe(
      "198.51.100.9",
    );
    expect(parseClientIp(headersFrom({}), {})).toBeNull();
  });
});

describe("extractClientSignals", () => {
  it("returns stable, non-reversible hashes for the same IP/UA", () => {
    const req = new Request("http://t.local/api/track", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "node" },
    });
    const a = extractClientSignals(req, { AUTH_SECRET: "s" });
    const b = extractClientSignals(req, { AUTH_SECRET: "s" });

    expect(a.ipHash).toBe(b.ipHash);
    expect(a.uaHash).toBe(b.uaHash);
    expect(a.ipHash).not.toContain("203.0.113.7");
    expect(a.ipHash).toMatch(/^[0-9a-f]{20}$/);
  });

  it("yields nulls when signals are absent", () => {
    const req = new Request("http://t.local/api/track");
    expect(extractClientSignals(req, {})).toEqual({ ipHash: null, uaHash: null });
  });

  it("different IPs hash differently (clustering key)", () => {
    const one = new Request("http://t.local", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    const two = new Request("http://t.local", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    });
    expect(extractClientSignals(one, { AUTH_SECRET: "s" }).ipHash).not.toBe(
      extractClientSignals(two, { AUTH_SECRET: "s" }).ipHash,
    );
  });
});
