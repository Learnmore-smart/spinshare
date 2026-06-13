/**
 * Signed `Device_Auth_Token` scheme used by {@link NextAuthDeviceProvider}.
 *
 * Production device tokens are **stateless and self-describing**: rather than
 * keep a server-side token table (which would not survive a restart or scale
 * horizontally), each token carries its claims and an HMAC-SHA256 signature.
 * `validateToken` re-computes the signature and checks expiry, resolving the
 * developer `userId` with no I/O (R4.7).
 *
 * Wire format (all segments base64url, no padding):
 *
 *   `v1.<payload>.<signature>`
 *
 * where `payload` is the JSON-encoded {@link DeviceTokenPayload} and
 * `signature = HMAC_SHA256(secret, "v1." + payload)`. The constant-time
 * comparison in {@link verifyDeviceToken} avoids signature-timing oracles.
 *
 * The signing secret comes from `AUTH_SECRET` (the same secret NextAuth uses);
 * a clearly-labelled development fallback keeps local `AUTH_MODE=oauth` working
 * without configuration, but production MUST set `AUTH_SECRET`.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthClaims } from "../../ports/auth-provider";

/** Token version prefix; lets us rotate the scheme without ambiguity. */
const TOKEN_VERSION = "v1";

/**
 * Development-only fallback secret. Used only when `AUTH_SECRET` is unset so
 * that local `AUTH_MODE=oauth` works out of the box; never relied on in
 * production (which sets `AUTH_SECRET`).
 */
const DEV_FALLBACK_SECRET = "spinshare-dev-insecure-secret-do-not-use-in-prod";

/** Claims embedded in a signed device token. */
export interface DeviceTokenPayload {
  /** Stable developer/user id this token authenticates. */
  userId: string;
  /** Email associated with the user, when known. */
  email?: string;
  /** Identity provider that issued the underlying session. */
  provider?: AuthClaims["provider"];
  /** Role asserted for the user, when known. */
  role?: AuthClaims["role"];
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
}

/** Resolves the active signing secret. */
function resolveSecret(explicit?: string): string {
  const secret = explicit ?? process.env.AUTH_SECRET;
  if (secret && secret.length > 0) return secret;
  return DEV_FALLBACK_SECRET;
}

/** Encodes a UTF-8 string as base64url (no padding). */
function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** Decodes a base64url string back to UTF-8. */
function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/** Computes the HMAC-SHA256 signature (base64url) over the signing input. */
function sign(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

/**
 * Mints a signed `Device_Auth_Token` for the given claims.
 *
 * @param claims  the user identity to embed (only `userId` is required).
 * @param opts    `nowSec` (defaults to wall-clock) and `ttlSec` (token
 *                lifetime, defaults to 30 days); `secret` overrides the env
 *                secret for tests.
 */
export function mintDeviceToken(
  claims: AuthClaims,
  opts: { nowSec?: number; ttlSec?: number; secret?: string } = {},
): string {
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const ttlSec = opts.ttlSec ?? 60 * 60 * 24 * 30; // 30 days
  const payload: DeviceTokenPayload = {
    userId: claims.userId,
    email: claims.email,
    provider: claims.provider,
    role: claims.role,
    iat: nowSec,
    exp: nowSec + ttlSec,
  };
  const encodedPayload = b64urlEncode(JSON.stringify(payload));
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = sign(signingInput, resolveSecret(opts.secret));
  return `${signingInput}.${signature}`;
}

/**
 * Verifies a signed `Device_Auth_Token` and returns its {@link AuthClaims},
 * or `null` if the token is malformed, has a bad signature, or has expired.
 * Performs no I/O — purely cryptographic (R4.7).
 */
export function verifyDeviceToken(
  token: string,
  opts: { nowSec?: number; secret?: string } = {},
): AuthClaims | null {
  if (typeof token !== "string" || token.length === 0) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const version = parts[0];
  const encodedPayload = parts[1];
  const signature = parts[2];
  if (
    version !== TOKEN_VERSION ||
    encodedPayload === undefined ||
    signature === undefined
  ) {
    return null;
  }

  const signingInput = `${version}.${encodedPayload}`;
  const expected = sign(signingInput, resolveSecret(opts.secret));

  // Constant-time comparison; bail if lengths differ (timingSafeEqual throws).
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: DeviceTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(encodedPayload)) as DeviceTokenPayload;
  } catch {
    return null;
  }

  if (typeof payload.userId !== "string" || payload.userId.length === 0) {
    return null;
  }

  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || nowSec >= payload.exp) return null;

  const claims: AuthClaims = { userId: payload.userId };
  if (payload.email !== undefined) claims.email = payload.email;
  if (payload.provider !== undefined) claims.provider = payload.provider;
  if (payload.role !== undefined) claims.role = payload.role;
  return claims;
}
