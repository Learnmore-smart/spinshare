/**
 * Client network-signal extraction for the impression hot path.
 *
 * The settlement endpoints run behind a trusted reverse proxy / load balancer
 * (Cloud Run, etc.), so the literal last `x-forwarded-for` segment is infra, not
 * the caller. We parse the client IP as the entry `TRUSTED_PROXY_HOP_COUNT`
 * positions from the RIGHT, then store only a salted HMAC of it (`ipHash`) plus
 * a hash of the User-Agent. Hashes are enough to cluster "many accounts, one
 * IP/UA" (fan-out) and run per-IP velocity without persisting raw PII. Raw-IP
 * intelligence (datacenter/ASN classification) is computed at ingest in Tier 2,
 * never reconstructed from the stored hash.
 */

import { createHmac } from "node:crypto";

const DEV_FALLBACK_SECRET = "spinshare-dev-insecure-secret-do-not-use-in-prod";
/** Default number of trusted proxy hops appended on the right of XFF. */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

export interface ClientSignals {
  /** Salted HMAC of the parsed client IP, or null when none could be parsed. */
  ipHash: string | null;
  /** Salted HMAC of the User-Agent, or null when absent. */
  uaHash: string | null;
}

function resolveSecret(env: Record<string, string | undefined>): string {
  const secret = env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : DEV_FALLBACK_SECRET;
}

function resolveTrustedHops(env: Record<string, string | undefined>): number {
  const raw = Number(env.TRUSTED_PROXY_HOP_COUNT);
  if (!Number.isFinite(raw) || raw < 0) {
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }
  return Math.floor(raw);
}

/**
 * Parses the client IP from `x-forwarded-for`, counting `trustedHops` proxy
 * entries in from the right. Falls back to `x-real-ip`, then null. The XFF list
 * is `client, proxy1, ..., proxyN`; with `trustedHops` infra hops on the right,
 * the client is at index `length - 1 - trustedHops`, clamped to the leftmost
 * entry so a shorter-than-expected chain still yields the original client.
 */
export function parseClientIp(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length > 0) {
      const trustedHops = resolveTrustedHops(env);
      const index = Math.max(0, parts.length - 1 - trustedHops);
      const candidate = parts[index];
      if (candidate !== undefined && candidate.length > 0) {
        return candidate;
      }
    }
  }
  const realIp = headers.get("x-real-ip")?.trim();
  return realIp && realIp.length > 0 ? realIp : null;
}

function hash(value: string, secret: string): string {
  // 20 hex chars (80 bits) is ample for collision-free clustering keys and keeps
  // the stored value compact and non-reversible.
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 20);
}

/**
 * Extracts privacy-preserving client signals (hashed IP + hashed User-Agent)
 * from a request's headers. Never throws; returns nulls when a signal is absent.
 */
export function extractClientSignals(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): ClientSignals {
  const secret = resolveSecret(env);
  const ip = parseClientIp(request.headers, env);
  const ua = request.headers.get("user-agent")?.trim();
  return {
    ipHash: ip ? hash(ip, secret) : null,
    uaHash: ua && ua.length > 0 ? hash(ua, secret) : null,
  };
}
