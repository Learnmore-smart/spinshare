/**
 * Mock {@link AuthProvider} — credential-free local/test stand-in for the
 * NextAuth-backed device authorization grant.
 *
 * Implements the full device flow deterministically:
 *   - `startDeviceFlow` issues a `deviceCode` / `userCode` (300s expiry, 5s
 *     poll interval),
 *   - tests drive approval/denial via {@link approveDevice} / {@link denyDevice},
 *   - `pollDeviceToken` returns the standard `authorization_pending` /
 *     `slow_down` / `expired_token` / `access_denied` / approved states,
 *   - approval mints a deterministic `Device_Auth_Token`,
 *   - `validateToken` resolves the `userId` for a minted token (or `null`).
 *
 * Time comes from the injected {@link Clock} so expiry / `slow_down` are
 * deterministic. See design "Local Development & Testability Strategy" and the
 * `/api/auth/device/*` contracts.
 */

import type {
  AuthClaims,
  AuthProvider,
  DeviceFlowHandle,
  DeviceTokenResult,
} from "../../ports/auth-provider";
import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./clock";

/** Device-code lifetime in seconds (matches the `/start` contract). */
const DEVICE_EXPIRES_IN_SEC = 300;
/** Minimum seconds between token polls before `slow_down` is returned. */
const DEVICE_POLL_INTERVAL_SEC = 5;
/** Where users "approve" a device in this mock. */
const VERIFICATION_URI = "https://mock.spinshare.local/activate";

interface DeviceRecord {
  userCode: string;
  /** Epoch millis at which the device code expires. */
  expiresAtMs: number;
  /** Epoch millis of the previous poll, for `slow_down` enforcement. */
  lastPollMs: number | null;
  state:
    | { kind: "pending" }
    | { kind: "approved"; userId: string; accessToken: string }
    | { kind: "denied" };
}

export class MockAuthProvider implements AuthProvider {
  /** deviceCode → record. */
  private readonly devices = new Map<string, DeviceRecord>();
  /** access token → userId. */
  private readonly tokens = new Map<string, string>();

  constructor(
    private readonly clock: Clock = new SystemClock(),
    private readonly ids: IdGenerator = new RandomIdGenerator(),
  ) {}

  async startDeviceFlow(): Promise<DeviceFlowHandle> {
    const deviceCode = this.ids.next("dc");
    const userCode = this.ids.next("uc").toUpperCase();
    this.devices.set(deviceCode, {
      userCode,
      expiresAtMs: this.clock.nowMs() + DEVICE_EXPIRES_IN_SEC * 1000,
      lastPollMs: null,
      state: { kind: "pending" },
    });
    return {
      deviceCode,
      userCode,
      verificationUri: VERIFICATION_URI,
      verificationUriComplete: `${VERIFICATION_URI}?user_code=${encodeURIComponent(userCode)}`,
      intervalSec: DEVICE_POLL_INTERVAL_SEC,
      expiresInSec: DEVICE_EXPIRES_IN_SEC,
    };
  }

  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult> {
    const record = this.devices.get(deviceCode);
    // Unknown code behaves like an expired/invalid grant.
    if (!record) return { status: "expired_token" };

    const nowMs = this.clock.nowMs();
    if (nowMs >= record.expiresAtMs) {
      this.devices.delete(deviceCode);
      return { status: "expired_token" };
    }

    // Enforce the minimum poll interval (slow_down), but only while pending.
    if (record.state.kind === "pending") {
      if (
        record.lastPollMs !== null &&
        nowMs - record.lastPollMs < DEVICE_POLL_INTERVAL_SEC * 1000
      ) {
        record.lastPollMs = nowMs;
        return { status: "slow_down" };
      }
      record.lastPollMs = nowMs;
      return { status: "authorization_pending" };
    }

    if (record.state.kind === "denied") {
      return { status: "access_denied" };
    }

    // Approved.
    return {
      status: "approved",
      accessToken: record.state.accessToken,
      tokenType: "Bearer",
    };
  }

  async validateToken(token: string): Promise<AuthClaims | null> {
    const userId = this.tokens.get(token);
    return userId ? { userId } : null;
  }

  // --- Test drivers -------------------------------------------------------

  /** Approves a pending device flow for `userId`, minting a token. */
  approveDevice(deviceCode: string, userId: string): string {
    const record = this.devices.get(deviceCode);
    if (!record) throw new Error(`unknown device code: ${deviceCode}`);
    const accessToken = this.mintToken(userId);
    record.state = { kind: "approved", userId, accessToken };
    return accessToken;
  }

  /** Marks a pending device flow as denied by the user. */
  denyDevice(deviceCode: string): void {
    const record = this.devices.get(deviceCode);
    if (!record) throw new Error(`unknown device code: ${deviceCode}`);
    record.state = { kind: "denied" };
  }

  /**
   * Mints a valid `Device_Auth_Token` for `userId` directly (no device flow).
   * Used by the e2e settlement test to authenticate `POST /api/track`.
   */
  mintToken(userId: string): string {
    const token = this.ids.next("tok");
    this.tokens.set(token, userId);
    return token;
  }
}
