/**
 * AuthProvider port — device authorization grant + browser session auth.
 *
 * Backed by `NextAuthDeviceProvider` (Auth.js + Google/GitHub) in production or
 * `MockAuthProvider` locally. See design "API Contracts" (`/api/auth/device/*`)
 * and the Ledger Engine token validation flow.
 */

import type { AuthProviderId, UserRole } from "@spinshare/core";

/**
 * Handle returned when a device flow is started. Mirrors the
 * `POST /api/auth/device/start` response.
 */
export interface DeviceFlowHandle {
  /** Opaque device code the client polls with. */
  deviceCode: string;
  /** Short human-enterable code shown to the user. */
  userCode: string;
  /** URL where the user approves the device. */
  verificationUri: string;
  /** Verification URL with the user code pre-filled. */
  verificationUriComplete: string;
  /** Minimum seconds between token polls. */
  intervalSec: number;
  /** Seconds until the device code expires (300). */
  expiresInSec: number;
}

/**
 * Result of polling for a device token. Mirrors the
 * `POST /api/auth/device/token` responses: a successful grant or one of the
 * standard pending/terminal states.
 */
export type DeviceTokenResult =
  | { status: "approved"; accessToken: string; tokenType: "Bearer" }
  | { status: "authorization_pending" }
  | { status: "slow_down" }
  | { status: "expired_token" }
  | { status: "access_denied" };

/**
 * Claims resolved from a valid `Device_Auth_Token`. `userId` is the stable
 * identifier used for crediting impressions.
 */
export interface AuthClaims {
  /** Stable user id the token authenticates. */
  userId: string;
  /** Email associated with the user, when available. */
  email?: string;
  /** Identity provider that issued the underlying session. */
  provider?: AuthProviderId;
  /** Role asserted for the user, when available. */
  role?: UserRole;
}

/** Authentication provider: device flow + token validation. */
export interface AuthProvider {
  /** Starts a device authorization grant. */
  startDeviceFlow(): Promise<DeviceFlowHandle>;
  /** Polls for the token associated with a device code. */
  pollDeviceToken(deviceCode: string): Promise<DeviceTokenResult>;
  /** Validates a token, returning claims or `null` if invalid/expired. */
  validateToken(token: string): Promise<AuthClaims | null>;
}
