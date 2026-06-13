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
import { selectAd } from "@/server/bidding-service";

/** Always evaluate at request time; ad selection is dynamic per request. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const { campaigns } = getContainer();
    const result = await selectAd({ campaigns });
    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
