import { describe, expect, it } from "vitest";

import { mintAdNonce, verifyAdNonce } from "./ad-nonce";

const SECRET = "test-secret";
const BINDING = { campaignId: "cmp_1", developerId: "dev_1" };

describe("ad-nonce mint/verify", () => {
  it("round-trips a valid nonce and exposes its jti", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET, jti: "n1", nowMs: 1000 });
    const payload = verifyAdNonce(token, { ...BINDING, secret: SECRET, nowMs: 2000 });
    expect(payload).not.toBeNull();
    expect(payload!.jti).toBe("n1");
    expect(payload!.campaignId).toBe("cmp_1");
    expect(payload!.developerId).toBe("dev_1");
  });

  it("rejects a campaign-id mismatch", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET });
    expect(
      verifyAdNonce(token, { campaignId: "cmp_other", developerId: "dev_1", secret: SECRET }),
    ).toBeNull();
  });

  it("rejects a developer-id mismatch (cannot reuse another dev's nonce)", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET });
    expect(
      verifyAdNonce(token, { campaignId: "cmp_1", developerId: "dev_other", secret: SECRET }),
    ).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET });
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(verifyAdNonce(tampered, { ...BINDING, secret: SECRET })).toBeNull();
  });

  it("rejects a nonce signed with a different secret", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET });
    expect(verifyAdNonce(token, { ...BINDING, secret: "other-secret" })).toBeNull();
  });

  it("rejects an expired nonce", () => {
    const token = mintAdNonce({ ...BINDING, secret: SECRET, nowMs: 0, ttlMs: 1000 });
    expect(verifyAdNonce(token, { ...BINDING, secret: SECRET, nowMs: 1001 })).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of [null, undefined, "", "a.b", "x.y.z"]) {
      expect(verifyAdNonce(bad, { ...BINDING, secret: SECRET })).toBeNull();
    }
  });
});
