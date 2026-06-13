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
  DeviceApproval,
  DeviceFlowHandle,
  DeviceTokenResult,
} from "../../ports/auth-provider";
import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./clock";

/** Loose environment view used to resolve the verification URL. */
type AuthEnv = Record<string, string | undefined>;

/** Device-code lifetime in seconds (matches the `/start` contract). */
const DEVICE_EXPIRES_IN_SEC = 300;
/** Minimum seconds between token polls before `slow_down` is returned. */
const DEVICE_POLL_INTERVAL_SEC = 5;
/** Fallback activation URL when no host is configured in the environment. */
const FALLBACK_VERIFICATION_URI = "https://spinshare.dev/activate";

/**
 * Resolves the browser activation URL the CLI/extension should open. Prefers an
 * explicit `AUTH_VERIFICATION_URI`, then `<NEXTAUTH_URL>/activate` (so local dev
 * targets `http://localhost:3000/activate`), then a production fallback. Mirrors
 * the production provider so the mock points at the real `/activate` page.
 */
function resolveVerificationUri(env: AuthEnv): string {
  return (
    env.AUTH_VERIFICATION_URI ??
    (env.NEXTAUTH_URL
      ? `${env.NEXTAUTH_URL.replace(/\/$/, "")}/activate`
      : null) ??
    FALLBACK_VERIFICATION_URI
  );
}

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
    private readonly env: AuthEnv = process.env,
  ) {}

  async startDeviceFlow(): Promise<DeviceFlowHandle> {
    const deviceCode = this.ids.next("dc");
    const userCode = this.ids.next("uc").toUpperCase();
    const verificationUri = resolveVerificationUri(this.env);
    this.devices.set(deviceCode, {
      userCode,
      expiresAtMs: this.clock.nowMs() + DEVICE_EXPIRES_IN_SEC * 1000,
      lastPollMs: null,
      state: { kind: "pending" },
    });
    return {
      deviceCode,
      userCode,
      verificationUri,
      verificationUriComplete: `${verificationUri}?user_code=${encodeURIComponent(userCode)}`,
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

  /**
   * Approves a pending device flow identified by its short user code, minting a
   * token for the browser-resolved {@link DeviceApproval} identity. This is the
   * port method the `/api/auth/device/approve` route calls in local/mock mode.
   */
  async approveDeviceByUserCode(
    userCode: string,
    approval: DeviceApproval,
  ): Promise<string> {
    const found = this.findByUserCode(userCode);
    if (!found) throw new Error(`unknown user code: ${userCode}`);
    return this.approveDevice(found.deviceCode, approval.userId);
  }

  /** Denies a pending device flow identified by its short user code. */
  async denyDeviceByUserCode(userCode: string): Promise<void> {
    const found = this.findByUserCode(userCode);
    if (!found) throw new Error(`unknown user code: ${userCode}`);
    this.denyDevice(found.deviceCode);
  }

  /** Finds a pending device record by its short user code (case-insensitive). */
  private findByUserCode(
    userCode: string,
  ): { deviceCode: string; record: DeviceRecord } | undefined {
    const normalized = userCode.toUpperCase();
    for (const [deviceCode, record] of this.devices) {
      if (record.userCode === normalized) return { deviceCode, record };
    }
    return undefined;
  }

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
