/**
 * `/api/funds/checkout` — start a Stripe checkout session to fund a campaign.
 *
 * Thin HTTP adapter over the {@link PaymentGateway} (wired from the
 * composition-root {@link getContainer container}). Authenticates the caller
 * via the bearer `Device_Auth_Token` and resolves the advertiser identity from
 * {@link AuthProvider.validateToken}.
 *
 *   - `POST /api/funds/checkout` — body `{ campaignId, amountCents }` validated
 *     by the core {@link fundingAmountSchema} (amount 100–10000000 cents,
 *     one-cent precision). On a valid amount in range it starts a hosted
 *     checkout session and returns `200 { url, sessionId }` (R9.6). When the
 *     amount is below $1.00, above $100,000.00, non-integer (sub-cent), or
 *     non-numeric, it returns `400 { error, details }` and SHALL NOT start a
 *     checkout session (R9.7).
 *
 * `401 Unauthorized` is returned when the token is missing or invalid (no
 * checkout session is started). See design "Campaign & Funding".
 */

import { fundingAmountSchema } from "@spinshare/core";

import { getContainer } from "@/server/container";

/** Always evaluate at request time; funding is a live, per-advertiser action. */
export const dynamic = "force-dynamic";

/** Bearer prefix used by the `Authorization` header. */
const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the bearer `Device_Auth_Token` from an `Authorization: Bearer
 * <token>` header. Returns `null` when the header is absent or not a bearer
 * credential.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * Resolves the authenticated advertiser id from the request's bearer token, or
 * `null` when the token is missing/invalid.
 */
async function resolveAdvertiserId(request: Request): Promise<string | null> {
  const token = extractBearerToken(request);
  if (token === null || token.length === 0) {
    return null;
  }
  const { auth } = getContainer();
  const claims = await auth.validateToken(token);
  return claims?.userId ?? null;
}

/** Standard `401` response body; no checkout session has been started. */
function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authenticate; reject with 401 (no session) on a missing/invalid token.
  const advertiserId = await resolveAdvertiserId(request);
  if (advertiserId === null) {
    return unauthorized();
  }

  // 2. Parse + validate the body via the core schema. Malformed JSON and schema
  //    violations (amount <$1.00, >$100,000.00, sub-cent, or non-numeric) both
  //    surface as 400; no checkout session is started (R9.7).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const parsed = fundingAmountSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      {
        error: issue?.message ?? "invalid_request_body",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // 3. Start the hosted checkout session for the validated amount (R9.6).
  const { payments } = getContainer();
  const { url, sessionId } = await payments.createCheckoutSession({
    campaignId: parsed.data.campaignId,
    amountCents: parsed.data.amountCents,
  });

  return Response.json({ url, sessionId }, { status: 200 });
}
