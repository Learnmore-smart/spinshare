/**
 * `POST /api/auth/device/token` — polls for a Device Authorization Grant token.
 *
 * Reads `{ deviceCode }` from the request body and delegates to the
 * composition-root {@link AuthProvider.pollDeviceToken}. Per the design "API
 * Contracts" for this endpoint (R4.4, R4.6):
 *
 * - `200` `{ accessToken, tokenType: "Bearer" }` once the user approves.
 * - `400` `{ error: "authorization_pending" }` while still waiting.
 * - `400` `{ error: "slow_down" }` when polling too fast.
 * - `400` `{ error: "expired_token" }` after the 300s timeout.
 * - `400` `{ error: "access_denied" }` if the user declines.
 *
 * A missing/invalid `deviceCode` is rejected with `400`
 * `{ error: "invalid_request" }` before any provider call.
 */

import { getContainer } from "@/server/container";

/** Always evaluate at request time; never statically cache. */
export const dynamic = "force-dynamic";

/** Minimal shape we read from the JSON body. */
interface TokenRequestBody {
  deviceCode?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let body: TokenRequestBody;
  try {
    body = (await request.json()) as TokenRequestBody;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { deviceCode } = body ?? {};
  if (typeof deviceCode !== "string" || deviceCode.length === 0) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await getContainer().auth.pollDeviceToken(deviceCode);

  if (result.status === "approved") {
    return Response.json(
      { accessToken: result.accessToken, tokenType: result.tokenType },
      { status: 200 },
    );
  }

  // pending / slow_down / expired_token / access_denied — surface the status
  // as the OAuth-style error code with a 400.
  return Response.json({ error: result.status }, { status: 400 });
}
