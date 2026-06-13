/**
 * `POST /api/track` — impression tracking / ledger endpoint.
 *
 * Records a single impression and returns the developer payout. The handler is
 * a thin HTTP adapter over the {@link recordImpression ledger service}: it
 * parses + Zod-validates the JSON body, extracts the bearer
 * `Device_Auth_Token`, delegates the money math + velocity/shadow-ban logic to
 * the service (wired from the composition-root {@link getContainer container}),
 * and maps the typed result to the `POST /api/track` API contract:
 *
 *   - `400 Bad Request` — malformed JSON or a body that fails
 *     {@link trackRequestSchema} (no mutation).
 *   - `401 Unauthorized` — missing/invalid token (no mutation, R2.9).
 *   - `422 Unprocessable Entity` — campaign missing or out of budget; body
 *     `{ error: "invalid_or_insufficient_campaign" }` (no mutation, R2.8).
 *   - `200 OK` — recorded (or shadow-banned, indistinguishable) with
 *     `{ recorded, developerCreditCents, developerCreditUsd }` (R2.7).
 *
 * See design "Ledger Engine" and the `POST /api/track` API contract.
 */

import { trackRequestSchema } from "@spinshare/core";

import { getContainer } from "@/server/container";
import { recordImpression } from "@/server/ledger-service";

/** Always evaluate at request time; impression accounting is per request. */
export const dynamic = "force-dynamic";

/** Bearer prefix used by the `Authorization` header. */
const BEARER_PREFIX = "Bearer ";

/**
 * Extracts the bearer `Device_Auth_Token` from an `Authorization: Bearer
 * <token>` header. Returns `null` when the header is absent or not a bearer
 * credential; the ledger service maps an absent/invalid token to `401`.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null) {
    return null;
  }
  if (!header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse + Zod-validate the body. Malformed JSON and schema violations both
  //    surface as 400 with no mutation.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "invalid_request_body" }, { status: 400 });
  }

  const parsed = trackRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "invalid_request_body" },
      { status: 400 },
    );
  }

  // 2. Extract the bearer Device_Auth_Token (validated by the ledger service).
  const token = extractBearerToken(request);

  // 3. Delegate to the ledger service with the composition-root providers.
  const { auth, campaigns, counters } = getContainer();
  const result = await recordImpression(
    { auth, campaigns, counters },
    { token, campaignId: parsed.data.campaignId },
  );

  // 4. Map the typed result to the HTTP contract.
  if (result.ok) {
    return Response.json(result.response, { status: 200 });
  }
  return Response.json({ error: result.error }, { status: result.status });
}
