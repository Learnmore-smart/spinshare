/**
 * Ad-serve nonce: binds one `GET /api/ad` serve to its later `POST /api/track`
 * settlement so a credit can never occur without a real, unreplayed ad serve.
 *
 * The nonce is a stateless HMAC token (same construction as `click-token.ts`)
 * carrying the campaign + developer it was issued for, a random single-use id
 * (`jti`), and an expiry. `/api/track` verifies the signature + binding (cheap,
 * stateless) on every segment and atomically consumes the `jti` exactly once at
 * settlement via `CounterStore.consumeOnce`, defeating replay. Verification is
 * intentionally separate from consumption so short pre-settlement segments do
 * not burn the nonce.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
/** Default nonce lifetime: generous enough for a real read, short enough to bound replay. */
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEV_FALLBACK_SECRET = "spinshare-dev-insecure-secret-do-not-use-in-prod";

export interface AdNoncePayload {
  campaignId: string;
  developerId: string;
  /** Random single-use id; the consume key that makes the nonce one-shot. */
  jti: string;
  iat: number;
  exp: number;
}

export interface MintAdNonceInput {
  campaignId: string;
  developerId: string;
  nowMs?: number;
  ttlMs?: number;
  secret?: string;
  /** Injectable for deterministic tests; defaults to a random 16-byte hex id. */
  jti?: string;
}

function resolveSecret(explicit?: string): string {
  const secret = explicit ?? process.env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : DEV_FALLBACK_SECRET;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function sign(signingInput: string, secret: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

export function mintAdNonce(input: MintAdNonceInput): string {
  const nowMs = input.nowMs ?? Date.now();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const payload: AdNoncePayload = {
    campaignId: input.campaignId,
    developerId: input.developerId,
    jti: input.jti ?? randomBytes(16).toString("hex"),
    iat: nowMs,
    exp: nowMs + ttlMs,
  };
  const encodedPayload = encodeJson(payload);
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  return `${signingInput}.${sign(signingInput, resolveSecret(input.secret))}`;
}

/**
 * Verifies signature, expiry, and campaign/developer binding. Returns the
 * payload (including `jti`) on success or null on any failure. Does NOT consume
 * the nonce — the caller consumes `jti` via `CounterStore.consumeOnce` at the
 * settlement boundary.
 */
export function verifyAdNonce(
  token: string | null | undefined,
  opts: { campaignId: string; developerId: string; nowMs?: number; secret?: string },
): AdNoncePayload | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [version, encodedPayload, signature] = parts;
  if (version !== TOKEN_VERSION || encodedPayload === undefined || signature === undefined) {
    return null;
  }

  const signingInput = `${version}.${encodedPayload}`;
  const expected = sign(signingInput, resolveSecret(opts.secret));
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodeJson<AdNoncePayload>(encodedPayload);
  if (
    payload === null ||
    payload.campaignId !== opts.campaignId ||
    payload.developerId !== opts.developerId ||
    typeof payload.jti !== "string" ||
    payload.jti.length === 0 ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  const nowMs = opts.nowMs ?? Date.now();
  return nowMs < payload.exp ? payload : null;
}
