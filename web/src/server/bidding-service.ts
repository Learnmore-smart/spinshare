/**
 * Bidding service for `GET /api/ad`.
 *
 * Loads the biddable candidate set from the {@link CampaignRepository}, delegates
 * winner selection to the pure {@link selectWinner} function in `@spinshare/core`,
 * and maps the result to the `GET /api/ad` response contract.
 *
 * The whole operation is wrapped in a hard 500ms timeout (Requirement 1.7): if
 * candidate loading or selection does not complete in time — or if no winner is
 * found — the service returns `{ adAvailable: false }` so the route can always
 * respond within the latency budget. See design "Bidding Engine" and the
 * `GET /api/ad` API contract.
 */

import { type AdResponse, formatCentsAsUsd, selectWinner } from "@spinshare/core";

import type { CampaignRepository } from "./ports";

/** Default hard latency budget for ad selection, in milliseconds (Req 1.7). */
export const BIDDING_TIMEOUT_MS = 500;

/**
 * Dependencies for the bidding service. Injected for testability; the
 * composition root supplies the concrete {@link CampaignRepository} adapter.
 */
export interface BiddingServiceDeps {
  /** Durable campaign repository providing the biddable candidate set. */
  campaigns: CampaignRepository;
  /**
   * Latency budget in milliseconds. Defaults to {@link BIDDING_TIMEOUT_MS}.
   * On timeout the service resolves to `{ adAvailable: false }`.
   */
  timeoutMs?: number;
}

/** Sentinel "no ad available" response (Req 1.4). */
const NO_AD: AdResponse = { adAvailable: false };

/**
 * Selects an advertisement for `GET /api/ad`.
 *
 * Builds the candidate set via {@link CampaignRepository.listBiddable}, picks the
 * winner with the pure {@link selectWinner} (highest CPM, earliest creation,
 * lowest id tie-breaks), and returns the available-ad shape including the CPM as
 * a USD display string. Returns `{ adAvailable: false }` when no candidate is
 * eligible or when the operation exceeds the timeout (Req 1.1, 1.2, 1.4, 1.7).
 *
 * Never rejects: repository errors and timeouts both resolve to the
 * no-ad response so the endpoint always answers within the latency budget.
 *
 * @param deps - Injected repository and optional timeout.
 * @returns A resolved {@link AdResponse}.
 */
export async function selectAd(deps: BiddingServiceDeps): Promise<AdResponse> {
  const { campaigns, timeoutMs = BIDDING_TIMEOUT_MS } = deps;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AdResponse>((resolve) => {
    timer = setTimeout(() => resolve(NO_AD), timeoutMs);
  });

  const selection = (async (): Promise<AdResponse> => {
    try {
      const candidates = await campaigns.listBiddable();
      const winner = selectWinner(candidates);
      if (winner === null) return NO_AD;
      return {
        adAvailable: true,
        campaignId: winner.id,
        adText: winner.adText,
        ...(winner.destinationUrl !== undefined
          ? { destinationUrl: winner.destinationUrl }
          : {}),
        ...(winner.brandName !== undefined
          ? { brandName: winner.brandName }
          : {}),
        cpmCents: winner.cpmCents,
        cpmUsd: formatCentsAsUsd(winner.cpmCents),
      };
    } catch {
      // Any failure loading/selecting candidates degrades to "no ad".
      return NO_AD;
    }
  })();

  try {
    return await Promise.race([selection, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
