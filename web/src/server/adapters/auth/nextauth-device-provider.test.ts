/**
 * Unit tests for the production NextAuth-backed {@link NextAuthDeviceProvider}
 * and the signed {@link mintDeviceToken} / {@link verifyDeviceToken} scheme.
 *
 * Focus (task 9.2): `validateToken` resolves the `userId` from a signed
 * `Device_Auth_Token` (R4.7), and the device authorization grant transitions
 * through the standard states (R4.1/4.2/4.6). Time and ids are injected for
 * determinism.
 */

import { describe, expect, it } from "vitest";
import { ManualClock, SequentialIdGenerator } from "../memory/clock";
import { mintDeviceToken, verifyDeviceToken } from "./device-token";
import { NextAuthDeviceProvider } from "./nextauth-device-provider";

const SECRET = "test-secret";

function makeProvider(startMs = 1_000_000) {
  const clock = new ManualClock(startMs);
  const ids = new SequentialIdGenerator();
  const provider = new NextAuthDeviceProvider({
    clock,
    ids,
    env: { AUTH_SECRET: SECRET, NEXTAUTH_URL: "https://app.test" },
  });
  return { provider, clock };
}

describe("device-token sign/verify", () => {
  it("round-trips claims and resolves userId", () => {
    const token = mintDeviceToken(
      { userId: "user_42", email: "a@b.dev", provider: "github", role: "developer" },
      { nowSec: 1000, ttlSec: 60, secret: SECRET },
    );
    const claims = verifyDeviceToken(token, { nowSec: 1010, secret: SECRET });
    expect(claims).toEqual({
      userId: "user_42",
      email: "a@b.dev",
      provider: "github",
      role: "developer",
    });
  });

  it("rejects a tampered payload", () => {
    const token = mintDeviceToken({ userId: "u1" }, { nowSec: 0, secret: SECRET });
    const [v, payload, sig] = token.split(".");
    const forged = Buffer.from('{"userId":"attacker","exp":9999999999}', "utf8").toString(
      "base64url",
    );
    expect(verifyDeviceToken(`${v}.${forged}.${sig}`, { secret: SECRET })).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = mintDeviceToken({ userId: "u1" }, { nowSec: 0, secret: "other" });
    expect(verifyDeviceToken(token, { nowSec: 1, secret: SECRET })).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = mintDeviceToken({ userId: "u1" }, { nowSec: 0, ttlSec: 10, secret: SECRET });
    expect(verifyDeviceToken(token, { nowSec: 10, secret: SECRET })).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyDeviceToken("", { secret: SECRET })).toBeNull();
    expect(verifyDeviceToken("not.a.token", { secret: SECRET })).toBeNull();
    expect(verifyDeviceToken("v9.x.y", { secret: SECRET })).toBeNull();
  });
});

describe("NextAuthDeviceProvider", () => {
  it("validateToken resolves userId for a minted token (R4.7)", async () => {
    const { provider } = makeProvider();
    const token = provider.mintToken("dev_7");
    const claims = await provider.validateToken(token);
    expect(claims?.userId).toBe("dev_7");
  });

  it("direct-minted tokens preserve optional email and role claims", async () => {
    const { provider } = makeProvider();
    const token = provider.mintToken("google:buyer-123", {
      email: "Buyer@Example.com",
      role: "advertiser",
    });

    const claims = await provider.validateToken(token);

    expect(claims).toMatchObject({
      userId: "google:buyer-123",
      email: "Buyer@Example.com",
      role: "advertiser",
    });
  });

  it("validateToken returns null for garbage", async () => {
    const { provider } = makeProvider();
    expect(await provider.validateToken("garbage")).toBeNull();
  });

  it("startDeviceFlow returns a 300s handle with a complete verification URI", async () => {
    const { provider } = makeProvider();
    const handle = await provider.startDeviceFlow();
    expect(handle.expiresInSec).toBe(300);
    expect(handle.intervalSec).toBe(5);
    expect(handle.verificationUri).toBe("https://app.test/activate");
    expect(handle.verificationUriComplete).toContain(
      encodeURIComponent(handle.userCode),
    );
  });

  it("polls pending → slow_down → approved and validates the issued token", async () => {
    const { provider, clock } = makeProvider();
    const handle = await provider.startDeviceFlow();

    // First poll: still waiting for the browser sign-in.
    expect(await provider.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "authorization_pending",
    });
    // Immediate re-poll is too fast.
    expect(await provider.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "slow_down",
    });

    // Browser session approves the device.
    clock.advanceSeconds(6);
    provider.approveDeviceByUserCode(handle.userCode, {
      userId: "dev_99",
      provider: "google",
      role: "developer",
    });

    const result = await provider.pollDeviceToken(handle.deviceCode);
    expect(result.status).toBe("approved");
    if (result.status !== "approved") throw new Error("expected approval");
    const claims = await provider.validateToken(result.accessToken);
    expect(claims?.userId).toBe("dev_99");
    expect(claims?.provider).toBe("google");
  });

  it("returns expired_token after the 300s timeout (R4.6)", async () => {
    const { provider, clock } = makeProvider();
    const handle = await provider.startDeviceFlow();
    clock.advanceSeconds(300);
    expect(await provider.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "expired_token",
    });
  });

  it("returns access_denied when the user declines", async () => {
    const { provider } = makeProvider();
    const handle = await provider.startDeviceFlow();
    provider.denyDevice(handle.deviceCode);
    expect(await provider.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "access_denied",
    });
  });
});
