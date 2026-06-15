/**
 * CSRF defense for state-changing, cookie-authenticated API routes.
 *
 * The payout routes (`/api/payouts/connect`, `/api/payouts/withdraw`) move real
 * money and authenticate via the NextAuth **session cookie**, which the browser
 * attaches automatically — the classic CSRF setup. NextAuth's built-in CSRF
 * token only guards its own `/api/auth/*` endpoints, not our custom routes, so
 * we add the OWASP-recommended primary defense for cookie-authed APIs: strict
 * **same-origin validation** of the `Origin` (or, as a fallback, `Referer`)
 * header.
 *
 * Why this works: browsers send `Origin` on cross-origin (and same-origin)
 * state-changing `fetch`/form POSTs, and a malicious page **cannot forge or omit
 * its own `Origin`** to impersonate ours. A forged cross-site POST therefore
 * carries the attacker's origin (rejected) or, for a plain HTML form, an origin
 * that still won't match ours. Same-origin dashboard calls always match and
 * pass.
 *
 * The allowed set is derived from the request itself (its URL origin and the
 * `Host`/`X-Forwarded-Proto` headers, to work behind proxies) plus any
 * explicitly configured deployment origins, so it needs no per-environment
 * wiring to function.
 */

/** Environment keys that may hold the canonical public origin of the app. */
const CONFIGURED_ORIGIN_KEYS = [
  "AUTH_URL",
  "NEXTAUTH_URL",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

/** A minimal read-only view of the environment (defaults to `process.env`). */
export type CsrfEnv = Record<string, string | undefined>;

/**
 * The set of origins considered "ours" for a given request: the request URL's
 * own origin, the `Host` header origin (honoring `X-Forwarded-Proto` behind a
 * proxy), and any configured deployment origins.
 */
export function allowedOrigins(
  request: Request,
  env: CsrfEnv = process.env,
): string[] {
  const origins = new Set<string>();

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // request.url is always absolute in Next route handlers; ignore if not.
  }

  const host = request.headers.get("host");
  if (host) {
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    // Only trust a proxy-supplied protocol; in its absence, derive the protocol
    // from `request.url` itself so `http://localhost` (local dev) and
    // `https://app.example` (direct production) both work without a per-env
    // env-var. Falling back to `https` only when we cannot determine the
    // protocol from the request keeps the helper total.
    let proto: string;
    if (forwardedProto) {
      proto = forwardedProto;
    } else {
      try {
        proto = new URL(request.url).protocol.replace(/:$/, "");
      } catch {
        proto = "https";
      }
    }
    origins.add(`${proto}://${host}`);
  }

  for (const key of CONFIGURED_ORIGIN_KEYS) {
    const value = env[key];
    if (value) {
      try {
        origins.add(new URL(value).origin);
      } catch {
        // Ignore malformed configured origins.
      }
    }
  }

  return [...origins];
}

/**
 * Whether `request` originates from the app itself, by matching the `Origin`
 * header (preferred) or the `Referer` host (fallback) against
 * {@link allowedOrigins}. A state-changing request carrying neither header is
 * treated as untrusted (returns `false`).
 */
export function isSameOrigin(
  request: Request,
  env: CsrfEnv = process.env,
): boolean {
  const allowed = allowedOrigins(request, env);

  const origin = request.headers.get("origin");
  if (origin !== null) {
    return allowed.includes(origin);
  }

  const referer = request.headers.get("referer");
  if (referer !== null) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // No Origin and no Referer on a state-changing request → reject (defense in
  // depth; legitimate browser POSTs always send at least one).
  return false;
}

/**
 * Guard for state-changing route handlers: returns a `403` {@link Response} when
 * the request fails same-origin validation, or `null` when it is allowed to
 * proceed. Call this first in the handler, before any side effects.
 */
export function assertSameOrigin(
  request: Request,
  env: CsrfEnv = process.env,
): Response | null {
  if (isSameOrigin(request, env)) {
    return null;
  }
  return Response.json({ error: "forbidden_origin" }, { status: 403 });
}
