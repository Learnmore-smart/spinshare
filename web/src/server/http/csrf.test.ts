/**
 * Tests for the same-origin CSRF guard protecting the money-moving payout
 * routes. Verifies that requests from the app's own origin pass, while
 * cross-origin (or origin-less) requests are rejected.
 */

import { describe, expect, it } from "vitest";

import { assertSameOrigin, isSameOrigin } from "./csrf";

const APP = "https://app.spinshare.example";

function req(headers: Record<string, string>): Request {
  return new Request(`${APP}/api/payouts/withdraw`, {
    method: "POST",
    headers,
  });
}

describe("isSameOrigin", () => {
  it("accepts a matching Origin header", () => {
    expect(isSameOrigin(req({ origin: APP }))).toBe(true);
  });

  it("rejects a cross-origin Origin header", () => {
    expect(isSameOrigin(req({ origin: "https://evil.example" }))).toBe(false);
  });

  it("falls back to the Referer host when Origin is absent", () => {
    expect(isSameOrigin(req({ referer: `${APP}/dashboard/developer` }))).toBe(
      true,
    );
  });

  it("rejects a cross-origin Referer", () => {
    expect(isSameOrigin(req({ referer: "https://evil.example/x" }))).toBe(false);
  });

  it("rejects a request with neither Origin nor Referer", () => {
    expect(isSameOrigin(req({}))).toBe(false);
  });

  it("accepts an explicitly configured deployment origin", () => {
    // Origin matches a configured AUTH_URL even if it differs from request.url.
    const request = new Request("https://internal.local/api/payouts/withdraw", {
      method: "POST",
      headers: { origin: APP },
    });
    expect(isSameOrigin(request, { AUTH_URL: APP })).toBe(true);
  });

  it("honors the Host header behind a proxy (X-Forwarded-Proto)", () => {
    const request = new Request("http://0.0.0.0:3000/api/payouts/withdraw", {
      method: "POST",
      headers: {
        origin: APP,
        host: "app.spinshare.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("accepts http://localhost without X-Forwarded-Proto (local dev)", () => {
    // Regression: previously the host-derived origin defaulted to `https`, so
    // the browser's `Origin: http://localhost:3000` failed the same-origin
    // check during `pnpm dev`. With no proxy header we now derive the
    // protocol from `request.url` itself.
    const request = new Request("http://localhost:3000/api/payouts/connect", {
      method: "POST",
      headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });
});

describe("assertSameOrigin", () => {
  it("returns null for a same-origin request", () => {
    expect(assertSameOrigin(req({ origin: APP }))).toBeNull();
  });

  it("returns a 403 response for a cross-origin request", async () => {
    const res = assertSameOrigin(req({ origin: "https://evil.example" }));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "forbidden_origin" });
  });
});
