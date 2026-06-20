/**
 * Integer-cent / micro-cent money math for SpinShare.
 *
 * Single source of truth for the 60/40 revenue split, penny rounding, and
 * budget conservation. Every impression moves real money, so the split must be
 * exact and identical everywhere it is computed (the `POST /api/track` ledger
 * engine, the Redis→Firestore flush, and the e2e settlement test all import
 * these functions). To stay exact we use **integer arithmetic only** — never
 * floats.
 *
 * Money convention (see design "Money/Ledger Math"):
 *   - CPM is dollars-per-1000-impressions. `cpmCents = round(cpmDollars * 100)`.
 *   - Per-impression revenue (cents) = `cpmCents / 1000` — a sub-cent rational.
 *   - We represent revenue in **micro-cents** (1 cent = 1000 micro-cents) so
 *     that the sub-cent value is an exact integer:
 *       `revenueMicrocents = cpmCents` (because cpmCents/1000 cents == cpmCents
 *       micro-cents).
 *   - The developer credit is rounded to the nearest whole cent (half-up); the
 *     platform retention is derived by subtraction so the split always conserves
 *     to the micro-cent.
 *
 * Range note: CPM ≤ $1000.00 ⇒ `cpmCents ≤ 100000` ⇒ all intermediate products
 * (e.g. `revenueMicrocents * 60`) stay far below `Number.MAX_SAFE_INTEGER`, so
 * `Math.floor` integer math is exact. A `bigint` path can replace this if the
 * limits ever widen.
 */

import type { Split } from "./types";

/** Number of micro-cents in one whole cent. */
export const MICROCENTS_PER_CENT = 1000;

/**
 * Impressions are always sold in fixed-size blocks. One block buys this many
 * views (priced at the campaign's CPM), so every funded budget is an exact
 * multiple of `cpmCents × IMPRESSIONS_PER_BLOCK / 1000 === cpmCents` cents.
 */
export const IMPRESSIONS_PER_BLOCK = 1000;

/** Developer share of per-impression revenue, as a whole-number percentage. */
export const DEVELOPER_SHARE_PERCENT = 60;

/** Minimum balance in integer cents before a developer payout can be initiated ($10.00). */
export const MINIMUM_PAYOUT_CENTS = 1000;

/**
 * Master kill switch for developer cash-outs. While `false`, developers can
 * still connect a Stripe account and keep accruing/tracking earnings, but
 * withdrawals are refused everywhere: `POST /api/payouts/withdraw` returns a
 * `503` and the dashboard renders a disabled "coming soon" button. Stripe
 * payouts are slated to go live in ~1–2 weeks — flip this to `true` to enable
 * real money movement.
 */
export const PAYOUT_WITHDRAWALS_ENABLED = false;

/**
 * Max developer credits that may accrue in a rolling 60-minute window ($20.00).
 * Enforced server-side by the ledger service (`wouldExceedEarningCap`): once
 * crediting an impression would breach this cap, the impression is served but
 * not credited until the window rolls over.
 */
export const DEVELOPER_HOURLY_EARNING_LIMIT_CENTS = 2_000;

/**
 * Max developer credits that may accrue per UTC calendar day ($300.00).
 * Enforced server-side alongside the hourly cap (`wouldExceedEarningCap`):
 * impressions beyond the cap are served but earn no credit until midnight UTC.
 */
export const DEVELOPER_DAILY_EARNING_LIMIT_CENTS = 30_000;

/**
 * Exact per-impression revenue in micro-cents for a given CPM.
 *
 * Revenue (cents) = `cpmCents / 1000`. In micro-cents (× 1000) this is exactly
 * `cpmCents`, so the conversion is the identity — kept as a named function for
 * clarity and a single point of truth.
 *
 * @param cpmCents Max CPM bid in integer cents.
 * @returns Per-impression revenue in integer micro-cents.
 */
export function perImpressionRevenueMicrocents(cpmCents: number): number {
  return cpmCents;
}

/**
 * Round `pct` percent of a micro-cent revenue to the nearest whole cent,
 * rounding half-up, using integer arithmetic only, then cap the result to the
 * whole cents available in the exact revenue.
 *
 * value (micro-cents) = `revenueMicrocents * pct / 100`
 * value (cents)       = that / MICROCENTS_PER_CENT
 *
 * Combined denominator is `100 * MICROCENTS_PER_CENT`. Half-up rounding adds
 * `denom / 2` before the integer floor division. The final cap prevents a
 * low-CPM sub-cent impression from crediting 1 cent when total exact revenue is
 * still below 1 cent, which would make platform retention negative.
 *
 * @param revenueMicrocents Exact per-impression revenue in micro-cents.
 * @param pct Whole-number percentage to take (e.g. 60 for the developer share).
 * @returns The rounded amount in whole integer cents.
 */
export function roundHalfUpToCents(revenueMicrocents: number, pct: number): number {
  const denom = 100 * MICROCENTS_PER_CENT; // 100000
  const roundedCreditCents = Math.floor(
    (revenueMicrocents * pct + denom / 2) / denom,
  );
  const availableWholeRevenueCents = Math.floor(
    revenueMicrocents / MICROCENTS_PER_CENT,
  );
  return Math.min(roundedCreditCents, availableWholeRevenueCents);
}

/**
 * Split one impression's revenue between the developer (60%, rounded half-up to
 * the nearest cent) and SpinShare (the remainder).
 *
 * Conservation is guaranteed by construction: retention is computed by
 * subtracting the developer credit (re-expressed in micro-cents) from the exact
 * revenue, so `developerCreditCents * MICROCENTS_PER_CENT +
 * spinshareRetentionMicrocents === revenueMicrocents` always holds. No money is
 * ever created or lost.
 *
 * @param cpmCents Winning campaign CPM in integer cents.
 * @returns The exact micro-cent revenue, the rounded developer credit in cents,
 *   and the platform retention in micro-cents.
 */
export function computeSplit(cpmCents: number): Split {
  const revenueMicrocents = perImpressionRevenueMicrocents(cpmCents);
  const developerCreditCents = roundHalfUpToCents(revenueMicrocents, DEVELOPER_SHARE_PERCENT);
  const developerCreditMicrocents = developerCreditCents * MICROCENTS_PER_CENT;
  const spinshareRetentionMicrocents = revenueMicrocents - developerCreditMicrocents;
  return { revenueMicrocents, developerCreditCents, spinshareRetentionMicrocents };
}

/**
 * An advertiser's purchased delivery, reconstructed from the remaining budget.
 */
export interface CampaignDelivery {
  /** Whole-block purchased impressions: a multiple of {@link IMPRESSIONS_PER_BLOCK}, never below served. */
  purchasedImpressions: number;
  /** Exact lifetime amount funded for those blocks, in integer cents. */
  totalPaidCents: number;
}

/**
 * Reconstruct how many impressions an advertiser bought (and how much they
 * paid) from a campaign's *remaining* whole-cent budget.
 *
 * Why this is not a plain `served + budget/cpm`: impressions are bought in
 * fixed {@link IMPRESSIONS_PER_BLOCK}-view blocks priced at the CPM, so the true
 * purchased total and amount paid are exact multiples of `(1000, cpmCents)`. But
 * `budgetCents` is stored in *whole cents* while a single impression costs a
 * *sub-cent* (`cpmCents / 1000`, e.g. $0.005 at a $5 CPM). The Redis→Firestore
 * flush rounds each batch's micro-cent spend to whole cents before decrementing
 * the budget, so the stored budget drifts a few cents below the exact remaining.
 * Naively deriving the purchased total from that drifted budget reads low — a
 * 1,000-view block shows as ~991 and a $5.00 spend shows as ~$4.95.
 *
 * We remove the drift by snapping the budget-derived raw total back onto the
 * 1,000-view block grid it must have come from (rounding to the nearest block),
 * never reporting fewer blocks than already cover what has been served. The paid
 * amount is then the exact `blocks × cpmCents`.
 *
 * @param cpmCents Campaign max CPM in integer cents (> 0 for biddable campaigns).
 * @param budgetCents Remaining campaign budget in integer cents.
 * @param servedImpressions Impressions already credited from the durable ledger.
 * @returns The snapped purchased impressions and the exact amount paid in cents.
 */
export function reconstructCampaignDelivery(
  cpmCents: number,
  budgetCents: number,
  servedImpressions: number,
): CampaignDelivery {
  const served = Math.max(0, Math.trunc(servedImpressions));
  const budget = Math.max(0, budgetCents);

  // A non-positive CPM cannot be priced into blocks; fall back to the raw budget
  // so callers never divide by zero or surface a negative total.
  if (cpmCents <= 0) {
    return { purchasedImpressions: served, totalPaidCents: budget };
  }

  const remainingImpressions = Math.floor(
    (budget * IMPRESSIONS_PER_BLOCK) / cpmCents,
  );
  const rawTotalImpressions = served + remainingImpressions;
  // Snap to the whole-block grid, but never fewer blocks than cover what has
  // already been served (guards against over-delivery edge cases).
  const blocks = Math.max(
    Math.round(rawTotalImpressions / IMPRESSIONS_PER_BLOCK),
    Math.ceil(served / IMPRESSIONS_PER_BLOCK),
  );

  return {
    purchasedImpressions: blocks * IMPRESSIONS_PER_BLOCK,
    totalPaidCents: blocks * cpmCents,
  };
}

/**
 * Format an integer-cent amount as a plain USD string (no currency symbol),
 * e.g. `18 → "0.18"`, `3000 → "30.00"`. Useful for the `*Usd` display fields in
 * API responses. Integer math only; handles negative values.
 *
 * @param cents Amount in integer cents.
 * @returns The amount formatted with exactly two decimal places.
 */
export function formatCentsAsUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, "0")}`;
}
