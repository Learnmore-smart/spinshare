/**
 * Production {@link AuthProvider} — NextAuth-backed browser session + Device
 * Authorization Grant, selected by `AUTH_MODE=oauth` at the composition root.
 *
 * Responsibilities:
 *   - **Browser auth (R4.3).** Google + GitHub sign-in is configured in
 *     {@link authConfig} / mounted via NextAuth `handlers`. The user completes
 *     OAuth in the browser; the device approval step then resolves their
 *     identity into a signed `Device_Auth_Token`.
 *   - **Device flow.** `startDeviceFlow` issues a `deviceCode` / `userCode`
 *     (300s expiry, 5s poll interval) tracked in a {@link DeviceCodeStore};
 *     `pollDeviceToken` returns the standard
 *     `authorization_pending` / `slow_down` / `expired_token` / `access_denied`
 *     / approved states. Approval (driven by the browser session via
 *     {@link approveDevice}) mints a signed token.
 *   - **Token validation (R4.7).** `validateToken` verifies the HMAC signature
 *     and expiry of a `Device_Auth_Token` and resolves the `userId` with no
 *     I/O — see {@link verifyDeviceToken}.
 *
 * The device-code store defaults to an in-process map. That is correct for a
 * single-instance deployment and for tests; a multi-instance deployment would
 * inject a shared (e.g. Redis-backed) {@link DeviceCodeStore}. Token validation
 * is fully stateless and therefore unaffected by the store choice.
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
} from "../memory/clock";
import { mintDeviceToken, verifyDeviceToken } from "./device-token";
import {
  getSharedDeviceCodeStore,
  type DeviceCodeStore,
} from "./device-code-store";
import { generateShortUserCode } from "./device-user-code";

/** Re-exported from the port so existing importers keep working. */
export type { DeviceApproval };

/** Loose environment view (matches the composition root's `ContainerEnv`). */
type AuthEnv = Record<string, string | undefined>;

/** Device-code lifetime in seconds (matches the `/start` contract). */
const DEVICE_EXPIRES_IN_SEC = 300;
/** Minimum seconds between token polls before `slow_down` is returned. */
const DEVICE_POLL_INTERVAL_SEC = 5;

/** Browser activation URL; clients open `?user_code=...` against this. */
function resolveVerificationUri(env: AuthEnv): string {
  const base =
    env.AUTH_VERIFICATION_URI ??
    (env.NEXTAUTH_URL ? `${env.NEXTAUTH_URL.replace(/\/$/, "")}/activate` : null) ??
    "https://spinshare.dev/activate";
  return base;
}

/** Options for {@link NextAuthDeviceProvider}. */
export interface NextAuthDeviceProviderOptions {
  clock?: Clock;
  ids?: IdGenerator;
  store?: DeviceCodeStore;
  env?: AuthEnv;
}

// Re-export for tests and custom deployments.
export type { DeviceCodeStore, DeviceRecord } from "./device-code-store";

export class NextAuthDeviceProvider implements AuthProvider {
  private readonly clock: Clock;
  private readonly ids: IdGenerator;
  private readonly store: DeviceCodeStore;
  private readonly env: AuthEnv;

  constructor(options: NextAuthDeviceProviderOptions = {}) {
    this.clock = options.clock ?? new SystemClock();
    this.ids = options.ids ?? new RandomIdGenerator();
    this.store = options.store ?? getSharedDeviceCodeStore();
    this.env = options.env ?? process.env;
  }

  async startDeviceFlow(): Promise<DeviceFlowHandle> {
    const deviceCode = this.ids.next("dc");
    const userCode = generateShortUserCode();
    const verificationUri = resolveVerificationUri(this.env);
    this.store.set(deviceCode, {
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
    const record = this.store.get(deviceCode);
    // Unknown code behaves like an expired/invalid grant.
    if (!record) return { status: "expired_token" };

    const nowMs = this.clock.nowMs();
    if (nowMs >= record.expiresAtMs) {
      this.store.delete(deviceCode);
      return { status: "expired_token" };
    }

    if (record.state.kind === "pending") {
      // Enforce the minimum poll interval (slow_down) while still pending.
      if (
        record.lastPollMs !== null &&
        nowMs - record.lastPollMs < DEVICE_POLL_INTERVAL_SEC * 1000
      ) {
        record.lastPollMs = nowMs;
        this.store.set(deviceCode, record);
        return { status: "slow_down" };
      }
      record.lastPollMs = nowMs;
      this.store.set(deviceCode, record);
      return { status: "authorization_pending" };
    }

    if (record.state.kind === "denied") {
      return { status: "access_denied" };
    }

    return {
      status: "approved",
      accessToken: record.state.accessToken,
      tokenType: "Bearer",
    };
  }

  async validateToken(token: string): Promise<AuthClaims | null> {
    return verifyDeviceToken(token, {
      nowSec: Math.floor(this.clock.nowMs() / 1000),
    });
  }

  // --- Browser-session approval -------------------------------------------

  /**
   * Approves a pending device flow for the identity resolved by the browser
   * NextAuth session, minting a signed `Device_Auth_Token`. Called by the
   * activation endpoint after the user signs in via Google/GitHub. Returns the
   * minted token. Throws if the user code is unknown or the flow already ended.
   */
  async approveDeviceByUserCode(
    userCode: string,
    approval: DeviceApproval,
  ): Promise<string> {
    const found = this.store.findByUserCode(userCode.toUpperCase());
    if (!found) throw new Error(`unknown user code: ${userCode}`);
    return this.approveDevice(found.deviceCode, approval);
  }

  /** Denies a pending device flow identified by its short `userCode`. */
  async denyDeviceByUserCode(userCode: string): Promise<void> {
    const found = this.store.findByUserCode(userCode.toUpperCase());
    if (!found) throw new Error(`unknown user code: ${userCode}`);
    this.denyDevice(found.deviceCode);
  }

  /** Approves a pending device flow by `deviceCode`, minting a signed token. */
  approveDevice(deviceCode: string, approval: DeviceApproval): string {
    const record = this.store.get(deviceCode);
    if (!record) throw new Error(`unknown device code: ${deviceCode}`);
    const accessToken = mintDeviceToken(
      {
        userId: approval.userId,
        email: approval.email,
        provider: approval.provider,
        role: approval.role,
      },
      { nowSec: Math.floor(this.clock.nowMs() / 1000) },
    );
    record.state = { kind: "approved", accessToken };
    this.store.set(deviceCode, record);
    return accessToken;
  }

  /** Marks a pending device flow as denied by the user. */
  denyDevice(deviceCode: string): void {
    const record = this.store.get(deviceCode);
    if (!record) throw new Error(`unknown device code: ${deviceCode}`);
    record.state = { kind: "denied" };
    this.store.set(deviceCode, record);
  }

  /**
   * Mints a valid `Device_Auth_Token` for `userId` directly (no device flow).
   * Parallels {@link MockAuthProvider.mintToken} for parity in tests/tools.
   */
  mintToken(userId: string): string {
    return mintDeviceToken(
      { userId },
      { nowSec: Math.floor(this.clock.nowMs() / 1000) },
    );
  }
}
