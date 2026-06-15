/**
 * Ledger service for `POST /api/track`.
 *
 * Records a single impression and computes the developer payout. The flow
 * mirrors design "Ledger Engine" (the 7-step flow) and the `POST /api/track`
 * API contract:
 *
 *   1. Validate the `Device_Auth_Token` via {@link AuthProvider.validateToken};
 *      reject `401` if missing/invalid (no mutation).
 *   2. Load the campaign from the durable {@link CampaignRepository}; reject
 *      `422` if it is missing or its authoritative `budgetCents <= 0` (no
 *      mutation).
 *   3. Compute the fixed 60s velocity window start and increment the
 *      per-developer counter.
 *   4. Evaluate shadow-ban: an existing ban, or this being the 31st+ impression
 *      in the window (count exceeds {@link VELOCITY_THRESHOLD}), marks the
 *      developer banned — and the threshold breach sets a fresh 60-minute ban.
 *   5. Compute the 60/40 split with the pure {@link computeSplit}.
 *   6. If **not** banned: {@link CounterStore.applyImpression} atomically credits
 *      the balance, decrements the budget by the full revenue, and enqueues a
 *      durable ledger entry. If banned: no money moves and no ledger entry is
 *      written. The same suppression applies when crediting would breach the
 *      per-developer hourly ($20) / daily ($300) earning caps (anti-abuse).
 *   7. Return the **same** success shape (`recorded: true`, the computed
 *      developer credit in cents + USD) whether recorded normally or shadow-
 *      banned, so the two cases are indistinguishable to the caller.
 *
 * The result is a discriminated union so the route (task 6.2) can map the
 * failure `status` to the right HTTP code without re-deriving it.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 10.1, 10.2, 10.3,
 * 10.4, 10.5, 10.6.
 */

import {
  type TrackResponse,
  DEVELOPER_DAILY_EARNING_LIMIT_CENTS,
  DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
  SHADOW_BAN_TTL_SECONDS,
  computeSplit,
  formatCentsAsUsd,
  isVelocityExceeded,
  windowStartEpochSec,
  wouldExceedEarningCap,
} from "@spinshare/core";

import {
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./adapters/memory";
import type { AuthProvider, CampaignRepository, CounterStore } from "./ports";

/**
 * Dependencies for the ledger service. The composition root supplies the
 * concrete {@link AuthProvider}, {@link CampaignRepository}, and
 * {@link CounterStore} adapters; {@link clock} and {@link ids} are injected for
 * deterministic time / `entryId` generation (tests wire a `ManualClock` +
 * `SequentialIdGenerator`) and default to their production equivalents.
 */
export interface LedgerServiceDeps {
  /** Validates the `Device_Auth_Token` and resolves the developer `userId`. */
  auth: AuthProvider;
  /** Durable campaign records (authoritative budget for the 422 check). */
  campaigns: CampaignRepository;
  /** Hot-path counter store: velocity, shadow-ban, atomic impression apply. */
  counters: CounterStore;
  /** Time source for the velocity window + impression timestamp. */
  clock?: Clock;
  /** Deterministic ledger `entryId` generator (idempotency key). */
  ids?: IdGenerator;
}

/** Inputs to record one impression. */
export interface RecordImpressionInput {
  /** Bearer `Device_Auth_Token` presented by the client (may be absent). */
  token: string | null | undefined;
  /** Campaign the impression is attributed to. */
  campaignId: string;
}

/** Failure status codes the route maps directly to HTTP responses. */
export type RecordImpressionErrorStatus = 401 | 422;

/** `422` error code (matches the `POST /api/track` contract body). */
export const INVALID_CAMPAIGN_ERROR = "invalid_or_insufficient_campaign" as const;
/** `401` error code for a missing/invalid token. */
export const UNAUTHORIZED_ERROR = "unauthorized" as const;

/**
 * Outcome of {@link recordImpression}: either a success response (recorded or
 * shadow-banned — identical shape) or a typed failure the route maps to a
 * `401`/`422` status.
 */
export type RecordImpressionResult =
  | { ok: true; response: TrackResponse }
  | { ok: false; status: RecordImpressionErrorStatus; error: string };

/**
 * Records one impression for `POST /api/track`.
 *
 * See the module header for the full 7-step flow. Never moves money on the
 * `401`/`422` paths; moves money exactly once on the recorded path and never
 * while shadow-banned, yet always returns the same success shape on the success
 * path (Requirements 2.1–2.9, 10.1–10.6).
 *
 * @param deps Injected providers + optional clock/id generator.
 * @param input The presented token and target campaign id.
 * @returns A resolved {@link RecordImpressionResult}.
 */
export async function recordImpression(
  deps: LedgerServiceDeps,
  input: RecordImpressionInput,
): Promise<RecordImpressionResult> {
  const { auth, campaigns, counters } = deps;
  const clock = deps.clock ?? new SystemClock();
  const ids = deps.ids ?? new RandomIdGenerator();

  // 1. Validate the Device_Auth_Token (Requirement 2.9 / 4.7). No mutation yet.
  const token = input.token?.trim();
  if (!token) {
    return { ok: false, status: 401, error: UNAUTHORIZED_ERROR };
  }
  const claims = await auth.validateToken(token);
  if (claims === null) {
    return { ok: false, status: 401, error: UNAUTHORIZED_ERROR };
  }
  const developerId = claims.userId;

  // 2. Load the campaign; reject if missing or out of budget (Requirement 2.8).
  // The authoritative budget lives in the campaign repository (the counter
  // store only tracks the pending delta since the last flush).
  const campaign = await campaigns.getById(input.campaignId);
  if (campaign === null || campaign.budgetCents <= 0) {
    return { ok: false, status: 422, error: INVALID_CAMPAIGN_ERROR };
  }

  // 3. Increment the fixed 60s velocity window counter (Requirement 10.1).
  const nowMs = clock.nowMs();
  const nowEpochSec = Math.floor(nowMs / 1000);
  const windowStart = windowStartEpochSec(nowEpochSec);
  const windowCount = await counters.incrementVelocity(developerId, windowStart);

  // 4. Evaluate shadow-ban (Requirements 10.2, 10.3, 10.4, 10.5, 10.6).
  // An already-active ban suppresses money; crossing the threshold (the 31st+
  // impression) sets a fresh 60-minute ban and suppresses this impression too.
  const alreadyBanned = await counters.isShadowBanned(developerId);
  const thresholdExceeded = isVelocityExceeded(windowCount);
  if (thresholdExceeded) {
    await counters.setShadowBan(developerId, SHADOW_BAN_TTL_SECONDS);
  }
  const banned = alreadyBanned || thresholdExceeded;

  // 5. Compute the split with the pure money math (Requirements 2.1, 2.2, 2.3,
  // 2.6). The same value is reported whether or not money moves, keeping the
  // shadow-ban response indistinguishable.
  const split = computeSplit(campaign.cpmCents);

  // 5b. Enforce the hourly/daily earning caps (anti-abuse). A developer — or a
  // bot farming impressions across many velocity windows — can never be
  // credited past $20/hour or $300/day. When crediting this impression would
  // breach either cap, suppress it: no money moves, but the response stays
  // indistinguishable from a recorded one (same handling as a shadow-ban).
  const earned = await counters.getEarnedCentsInWindows(developerId, nowMs);
  const capExceeded = wouldExceedEarningCap(earned, split.developerCreditCents, {
    hourlyLimitCents: DEVELOPER_HOURLY_EARNING_LIMIT_CENTS,
    dailyLimitCents: DEVELOPER_DAILY_EARNING_LIMIT_CENTS,
  });
  const suppressed = banned || capExceeded;

  // 6. Move money exactly once — only when neither banned nor capped
  // (Requirements 2.4, 2.5, 10.4, 10.5). When suppressed, skip crediting/
  // decrementing/enqueueing entirely and do not count it toward the caps.
  if (!suppressed) {
    await counters.applyImpression({
      developerId,
      campaignId: campaign.id,
      entryId: ids.next("entry"),
      split,
      occurredAtMs: nowMs,
    });
    await counters.addEarnedCents(developerId, split.developerCreditCents, nowMs);
  }

  // 7. Identical success shape for recorded and shadow-banned (Requirements 2.7,
  // 10.4).
  const response: TrackResponse = {
    recorded: true,
    developerCreditCents: split.developerCreditCents,
    developerCreditUsd: formatCentsAsUsd(split.developerCreditCents),
  };
  return { ok: true, response };
}
