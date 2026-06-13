/**
 * Integration test for the device-authorization-grant timeout (task 9.3).
 *
 * Requirement 4.6: "IF the browser-based authentication flow does not complete
 * within its configured timeout, THEN THE Auth_Service SHALL cancel the pending
 * authentication request and SHALL report a failure to the requesting device."
 *
 * The device flow advertises `expiresInSec = 300`. This test drives the
 * `MockAuthProvider` with an injected {@link ManualClock} so the 300s timeout is
 * deterministic: it confirms the grant is still `authorization_pending` before
 * expiry, then advances the clock past `expiresInSec` WITHOUT approving and
 * asserts `pollDeviceToken` returns `{ status: "expired_token" }`.
 *
 * The provider is constructed directly with a `ManualClock` rather than via the
 * composition root, because `getContainer()` wires a real `SystemClock` whose
 * time cannot be advanced inside a test.
 */

import { describe, expect, it } from "vitest";

import {
  ManualClock,
  MockAuthProvider,
  SequentialIdGenerator,
} from "./adapters/memory";

/** The device-code lifetime advertised by `startDeviceFlow` (R4.1/R4.6). */
const EXPIRES_IN_SEC = 300;

describe("device flow timeout (R4.6)", () => {
  it("returns expired_token when the flow is not approved within expiresInSec", async () => {
    const clock = new ManualClock(0);
    const auth = new MockAuthProvider(clock, new SequentialIdGenerator());

    // Start the device flow; it advertises a 300s expiry window.
    const handle = await auth.startDeviceFlow();
    expect(handle.expiresInSec).toBe(EXPIRES_IN_SEC);

    // Before expiry (and without approval) the grant is still pending.
    const beforeExpiry = await auth.pollDeviceToken(handle.deviceCode);
    expect(beforeExpiry).toEqual({ status: "authorization_pending" });

    // Just shy of the timeout the grant must NOT yet be expired. We advance to
    // one second before expiry and poll after the slow-down interval so the
    // poll is not throttled.
    clock.advanceSeconds(EXPIRES_IN_SEC - 1);
    const justBefore = await auth.pollDeviceToken(handle.deviceCode);
    expect(justBefore.status).not.toBe("expired_token");

    // Cross the expiry boundary without ever approving the device.
    clock.advanceSeconds(1);
    const atExpiry = await auth.pollDeviceToken(handle.deviceCode);
    expect(atExpiry).toEqual({ status: "expired_token" });
  });

  it("keeps returning expired_token after the grant has timed out", async () => {
    const clock = new ManualClock(0);
    const auth = new MockAuthProvider(clock, new SequentialIdGenerator());

    const handle = await auth.startDeviceFlow();

    // Advance well past the expiry window with no approval.
    clock.advanceSeconds(EXPIRES_IN_SEC + 60);

    expect(await auth.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "expired_token",
    });
    // A subsequent poll of the now-discarded grant still reports expired.
    expect(await auth.pollDeviceToken(handle.deviceCode)).toEqual({
      status: "expired_token",
    });
  });
});
