/**
 * `GET /api/ad` — advertisement bidding endpoint.
 *
 * Delegates to the {@link selectAd bidding service}, which loads the biddable
 * candidate set from the composition-root {@link getContainer container} and
 * picks the winner via the pure `selectWinner` (highest CPM, earliest creation,
 * lowest id tie-breaks). The service wraps selection in a hard 500ms timeout and
 * never rejects, so this handler always answers within the latency budget
 * (R1.7).
 *
 * On the success path it returns `200` with either the winner shape
 * (`adAvailable: true` + `campaignId`, `adText`, `cpmCents`, `cpmUsd`) or the
 * no-ad sentinel `{ adAvailable: false }` (R1.3, R1.4, R1.6). Any unexpected
 * internal error degrades to `500`. See design "Bidding Engine" and the
 * `GET /api/ad` API contract.
 */

import { getContainer } from "@/server/container";
import { mintClickToken } from "@/server/click-token";
import { mintAdNonce } from "@/server/ad-nonce";
import { selectAd } from "@/server/bidding-service";
import type { AdResponse } from "@spinshare/core";

/** Always evaluate at request time; ad selection is dynamic per request. */
export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

function withTrackedClickUrl(
  request: Request,
  result: AdResponse,
  developerId: string,
): AdResponse {
  if (!result.adAvailable || result.destinationUrl === undefined) {
    return result;
  }
  const destinationUrl = new URL("/api/click", request.url);
  destinationUrl.searchParams.set("campaignId", result.campaignId);
  destinationUrl.searchParams.set(
    "clickToken",
    mintClickToken({ campaignId: result.campaignId, developerId }),
  );
  return { ...result, destinationUrl: destinationUrl.toString() };
}

/**
 * Attaches a single-use ad-serve nonce binding this serve to its later
 * settlement. The client must echo it in `/api/track`; the server consumes it
 * once, so a credit can never occur without a real, unreplayed ad serve.
 */
function withAdNonce(result: AdResponse, developerId: string): AdResponse {
  if (!result.adAvailable) {
    return result;
  }
  return {
    ...result,
    adNonce: mintAdNonce({ campaignId: result.campaignId, developerId }),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { auth, campaigns, counters, progress } = getContainer();
    const token = extractBearerToken(request);
    if (token === null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const claims = await auth.validateToken(token).catch(() => null);
    if (claims === null) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await selectAd({
      campaigns,
      progress,
      developerId: claims.userId,
    });
    if (result.adAvailable) {
      const servedAtMs = Date.now();
      await progress.addDuration({
        developerId: claims.userId,
        campaignId: result.campaignId,
        viewDurationMs: 0,
        nowMs: servedAtMs,
        // Stamp the trusted serve time so settlement can derive a server-clocked
        // dwell that the client-reported viewDurationMs can never forge.
        servedAtMs,
      });
      try {
        await counters.incrementCampaignTelemetry(result.campaignId, "shows");
      } catch {
        // Telemetry must never block ad serving.
      }
    }
    return Response.json(
      withAdNonce(withTrackedClickUrl(request, result, claims.userId), claims.userId),
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
